// Created: 2026-09-26 21:46
// 게임 모드 (timeLimit: 문제당 제한 시간(초), null이면 제한 없음)
const GAME_MODES = {
  full: { name: "전체 도전", questions: 40, timeLimit: null, description: "카테고리마다 10문제씩, 모두 40문제" },
  category: { name: "카테고리 도전", questions: 10, timeLimit: null, description: "고른 카테고리에서 10문제" },
  speed: { name: "스피드 퀴즈", questions: 20, timeLimit: 15, description: "전체에서 20문제, 문제당 15초" },
};

const HINTS_PER_GAME = 3;
const HINT_REMOVE_COUNT = 2;

// 게임 상태
const state = {
  mode: "full",
  category: null,
  questions: [],
  currentIndex: 0,
  score: 0,
  correctCount: 0,
  answered: false,
  streak: 0,
  longestStreak: 0,
  hintsLeft: HINTS_PER_GAME,
  hintUsed: false, // 현재 문제에서 힌트를 썼는지
  removed: new Set(), // 힌트로 지운 선택지 인덱스
  paused: false,
  questionStart: 0, // performance.now() 기준
  pauseStart: 0,
  pausedTotal: 0, // 현재 문제에서 일시정지로 흐른 시간(ms)
  timerId: null,
  records: [], // 답한 문제마다 { category, isCorrect, timeSpent, hintUsed, points }
  endedEarly: false,
};

const scoreManager = new ScoreManager();

const $ = (id) => document.getElementById(id);

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  $(`${name}-screen`).classList.add("active");
}

function renderModeOptions() {
  const list = $("mode-list");
  Object.entries(GAME_MODES).forEach(([key, mode], i) => {
    const label = document.createElement("label");
    label.className = "mode-option";
    label.innerHTML = `
      <input type="radio" name="mode" value="${key}" ${i === 0 ? "checked" : ""}>
      <span class="mode-name">${mode.name}</span>
      <span class="mode-desc">${mode.description}</span>`;
    list.appendChild(label);
  });
  list.addEventListener("change", () => {
    $("category-field").classList.toggle("hidden", selectedMode() !== "category");
  });
}

function renderCategoryOptions() {
  const select = $("category-select");
  CATEGORIES.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

// Fisher-Yates 셔플 (원본 배열을 직접 섞음)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 모드에 맞게 문제를 무작위로 뽑음. 순서 섞기를 끄면 id 순서로 정렬
function pickQuestions(modeKey, category, shuffleOrder) {
  const mode = GAME_MODES[modeKey];
  let picked;
  if (modeKey === "full") {
    const perCategory = Math.floor(mode.questions / CATEGORIES.length);
    picked = CATEGORIES.flatMap((cat) => shuffle(getQuestionsByCategory(cat)).slice(0, perCategory));
  } else if (modeKey === "category") {
    picked = shuffle(getQuestionsByCategory(category)).slice(0, mode.questions);
  } else {
    picked = shuffle(getQuestionsByCategory("전체")).slice(0, mode.questions);
  }
  return shuffleOrder ? shuffle(picked) : picked.sort((a, b) => a.id - b.id);
}

function initGame() {
  state.mode = selectedMode();
  state.category = state.mode === "category" ? $("category-select").value : null;
  state.questions = pickQuestions(state.mode, state.category, $("shuffle-check").checked);
  state.currentIndex = 0;
  state.score = 0;
  state.correctCount = 0;
  state.streak = 0;
  state.longestStreak = 0;
  state.hintsLeft = HINTS_PER_GAME;
  state.paused = false;
  state.records = [];
  state.endedEarly = false;
  $("pause-overlay").classList.add("hidden");
  $("time-bar").classList.toggle("hidden", !timeLimit());
  showScreen("quiz");
  loadQuestion();
}

function timeLimit() {
  return GAME_MODES[state.mode].timeLimit;
}

function loadQuestion() {
  const q = state.questions[state.currentIndex];
  const total = state.questions.length;
  state.answered = false;
  state.hintUsed = false;
  state.removed = new Set();

  $("progress-text").textContent = `${state.currentIndex + 1} / ${total}`;
  $("progress-fill").style.width = `${(state.currentIndex / total) * 100}%`;
  $("score-text").textContent = `점수: ${state.score}`;
  $("question-category").textContent = q.category;
  $("question-difficulty").textContent = q.difficulty;
  $("question-difficulty").className = `badge difficulty ${q.difficulty}`;
  $("question-text").textContent = q.question;
  updateComboBadge();

  const optionsEl = $("options");
  optionsEl.innerHTML = "";
  q.options.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = `${i + 1}. ${text}`;
    btn.addEventListener("click", () => handleAnswer(i));
    optionsEl.appendChild(btn);
  });

  $("feedback").className = "feedback hidden";
  $("next-btn").classList.add("hidden");
  updateHintButton();
  startTimer();
}

// ----- 타이머 -----

// 현재 문제에서 흐른 시간(초). 일시정지한 시간은 빼고 셈
function elapsedSeconds() {
  const now = state.paused ? state.pauseStart : performance.now();
  return (now - state.questionStart - state.pausedTotal) / 1000;
}

function startTimer() {
  stopTimer();
  state.questionStart = performance.now();
  state.pausedTotal = 0;
  renderTimer();
  state.timerId = setInterval(tick, 100);
}

function stopTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
}

function tick() {
  if (state.paused || state.answered) return;
  renderTimer();
  const limit = timeLimit();
  if (limit && elapsedSeconds() >= limit) handleAnswer(null);
}

function renderTimer() {
  const limit = timeLimit();
  const elapsed = elapsedSeconds();
  const timerEl = $("timer-text");
  if (limit) {
    const remaining = Math.max(0, limit - elapsed);
    timerEl.textContent = `⏱ ${Math.ceil(remaining)}초`;
    timerEl.classList.toggle("warning", remaining <= 5);
    $("time-fill").style.width = `${(remaining / limit) * 100}%`;
  } else {
    timerEl.textContent = `⏱ ${Math.floor(elapsed)}초`;
    timerEl.classList.remove("warning");
  }
}

// ----- 일시정지 -----

function togglePause() {
  if (state.paused) {
    state.pausedTotal += performance.now() - state.pauseStart;
    state.paused = false;
    $("pause-overlay").classList.add("hidden");
    if (state.answered) $("next-btn").focus();
  } else {
    state.pauseStart = performance.now();
    state.paused = true;
    $("pause-overlay").classList.remove("hidden");
    $("resume-btn").focus();
  }
}

// ----- 힌트 -----

function updateHintButton() {
  const btn = $("hint-btn");
  btn.textContent = `힌트 (${state.hintsLeft})`;
  btn.disabled = state.hintsLeft === 0 || state.hintUsed || state.answered;
}

// 오답 중 HINT_REMOVE_COUNT개를 무작위로 지움
function useHint() {
  if (state.answered || state.paused || state.hintUsed || state.hintsLeft === 0) return;
  const q = state.questions[state.currentIndex];
  const wrongIndexes = q.options.map((_, i) => i).filter((i) => i !== q.correctAnswer);
  const buttons = $("options").querySelectorAll(".option");
  shuffle(wrongIndexes).slice(0, HINT_REMOVE_COUNT).forEach((i) => {
    state.removed.add(i);
    buttons[i].disabled = true;
    buttons[i].classList.add("removed");
  });
  state.hintUsed = true;
  state.hintsLeft -= 1;
  updateHintButton();
}

// ----- 답 처리 -----

// selectedIndex가 null이면 시간 초과
function handleAnswer(selectedIndex) {
  if (state.answered || state.paused || state.removed.has(selectedIndex)) return;
  state.answered = true;
  stopTimer();

  const q = state.questions[state.currentIndex];
  const limit = timeLimit();
  const timeSpent = limit ? Math.min(elapsedSeconds(), limit) : elapsedSeconds();
  const isCorrect = selectedIndex === q.correctAnswer;

  if (isCorrect) {
    state.streak += 1;
    state.longestStreak = Math.max(state.longestStreak, state.streak);
    state.correctCount += 1;
  } else {
    state.streak = 0;
  }
  const breakdown = scoreManager.getBreakdown(isCorrect, timeSpent, state.streak, state.hintUsed);
  const points = breakdown.base + breakdown.time + breakdown.noHint + breakdown.combo;
  state.score += points;
  state.records.push({ category: q.category, isCorrect, timeSpent, hintUsed: state.hintUsed, points });

  renderTimer();
  updateHintButton();
  updateComboBadge();
  showFeedback(isCorrect, selectedIndex, breakdown, points);
}

function updateComboBadge() {
  const badge = $("combo-badge");
  badge.textContent = `${state.streak}연속 정답`;
  badge.classList.toggle("hidden", state.streak < 2);
}

function describePoints(isCorrect, breakdown, points) {
  if (!isCorrect) return "+0점";
  const parts = [`기본 ${breakdown.base}`];
  if (breakdown.time) parts.push(`빠른 답변 +${breakdown.time}`);
  if (breakdown.noHint) parts.push(`노힌트 +${breakdown.noHint}`);
  if (breakdown.combo) parts.push(`${state.streak}연속 콤보 +${breakdown.combo}`);
  return `+${points}점 (${parts.join(" · ")})`;
}

function showFeedback(isCorrect, selectedIndex, breakdown, points) {
  const q = state.questions[state.currentIndex];
  const buttons = $("options").querySelectorAll(".option");
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correctAnswer) btn.classList.add("correct");
    else if (i === selectedIndex) btn.classList.add("wrong");
  });

  const feedback = $("feedback");
  feedback.className = `feedback ${isCorrect ? "correct" : "wrong"}`;
  const answerText = q.options[q.correctAnswer];
  $("feedback-title").textContent = isCorrect
    ? "정답입니다!"
    : selectedIndex === null
      ? `시간 초과! 정답: ${answerText}`
      : `오답입니다. 정답: ${answerText}`;
  $("feedback-points").textContent = describePoints(isCorrect, breakdown, points);
  $("feedback-explanation").textContent = q.explanation;
  $("score-text").textContent = `점수: ${state.score}`;

  const isLast = state.currentIndex === state.questions.length - 1;
  $("next-btn").textContent = isLast ? "결과 보기" : "다음 문제";
  $("next-btn").classList.remove("hidden");
  $("next-btn").focus();
}

function nextQuestion() {
  if (state.paused) return;
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex += 1;
    loadQuestion();
  } else {
    endGame();
  }
}

function quitGame() {
  state.paused = false;
  $("pause-overlay").classList.add("hidden");
  state.endedEarly = true;
  endGame();
}

// ----- 결과 -----

// 답한 문제 기록으로 결과 통계를 만듦 (중간에 그만두면 답한 문제까지만)
function buildResult() {
  const records = state.records;
  const total = records.length;
  const correct = records.filter((r) => r.isCorrect).length;
  const categoryStats = {};
  records.forEach((r) => {
    const stat = categoryStats[r.category] || (categoryStats[r.category] = { correct: 0, total: 0 });
    stat.total += 1;
    if (r.isCorrect) stat.correct += 1;
  });
  const totalTime = records.reduce((sum, r) => sum + r.timeSpent, 0);
  return {
    totalScore: state.score,
    correctAnswers: correct,
    totalQuestions: total,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    categoryStats,
    averageResponseTime: total ? Math.round((totalTime / total) * 10) / 10 : 0,
    longestStreak: state.longestStreak,
    hintsUsed: HINTS_PER_GAME - state.hintsLeft,
  };
}

function endGame() {
  stopTimer();
  const result = buildResult();
  const modeName = GAME_MODES[state.mode].name;

  $("progress-fill").style.width = "100%";
  $("result-mode").textContent = state.category ? `${modeName} · ${state.category}` : modeName;
  $("result-score").textContent = `${result.totalScore}점`;
  $("result-detail").textContent =
    `${result.totalQuestions}문제 중 ${result.correctAnswers}문제 정답` +
    (state.endedEarly ? ` (전체 ${state.questions.length}문제 중 중간 종료)` : "");
  $("stat-accuracy").textContent = `${result.accuracy}%`;
  $("stat-time").textContent = `${result.averageResponseTime}초`;
  $("stat-streak").textContent = `${result.longestStreak}문제`;
  $("stat-hints").textContent = `${result.hintsUsed} / ${HINTS_PER_GAME}회`;

  const tbody = $("category-stats-body");
  tbody.innerHTML = "";
  CATEGORIES.filter((cat) => result.categoryStats[cat]).forEach((cat) => {
    const { correct, total } = result.categoryStats[cat];
    const row = document.createElement("tr");
    row.innerHTML = `<td>${cat}</td><td>${correct} / ${total}</td><td>${Math.round((correct / total) * 100)}%</td>`;
    tbody.appendChild(row);
  });
  document.querySelector(".category-stats").classList.toggle("hidden", tbody.children.length === 0);

  showScreen("result");
}

// 숫자키 1~4로 답 선택, H 힌트, P/Esc 일시정지. Enter는 포커스된 다음 버튼이 받음
// 한글 입력 상태에서도 동작하도록 e.code로 확인
document.addEventListener("keydown", (e) => {
  if (!$("quiz-screen").classList.contains("active")) return;
  if (e.code === "KeyP" || e.code === "Escape") {
    togglePause();
    return;
  }
  if (state.paused) return;
  if (e.code === "KeyH") {
    useHint();
  } else if (!state.answered && ["1", "2", "3", "4"].includes(e.key)) {
    handleAnswer(Number(e.key) - 1);
  }
});

renderModeOptions();
renderCategoryOptions();
$("start-btn").addEventListener("click", initGame);
$("next-btn").addEventListener("click", nextQuestion);
$("hint-btn").addEventListener("click", useHint);
$("pause-btn").addEventListener("click", togglePause);
$("resume-btn").addEventListener("click", togglePause);
$("quit-btn").addEventListener("click", quitGame);
$("restart-btn").addEventListener("click", () => showScreen("start"));

// Created: 2026-09-26 21:46
// 게임 상태
const state = {
  category: "전체",
  questions: [],
  currentIndex: 0,
  score: 0,
  correctCount: 0,
  answered: false,
};

const POINTS_PER_QUESTION = 10;

const $ = (id) => document.getElementById(id);

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  $(`${name}-screen`).classList.add("active");
}

function renderCategoryOptions() {
  const select = $("category-select");
  ["전체", ...CATEGORIES].forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    const count = getQuestionsByCategory(cat).length;
    option.textContent = `${cat} (${count}문제)`;
    select.appendChild(option);
  });
}

// Fisher-Yates 셔플 (원본 배열을 직접 섞음)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function initGame() {
  state.category = $("category-select").value;
  state.questions = getQuestionsByCategory(state.category);
  if ($("shuffle-check").checked) shuffle(state.questions);
  state.currentIndex = 0;
  state.score = 0;
  state.correctCount = 0;
  state.answered = false;
  showScreen("quiz");
  loadQuestion();
}

function loadQuestion() {
  const q = state.questions[state.currentIndex];
  const total = state.questions.length;
  state.answered = false;

  $("progress-text").textContent = `${state.currentIndex + 1} / ${total}`;
  $("progress-fill").style.width = `${(state.currentIndex / total) * 100}%`;
  $("score-text").textContent = `점수: ${state.score}`;
  $("question-category").textContent = q.category;
  $("question-difficulty").textContent = q.difficulty;
  $("question-difficulty").className = `badge difficulty ${q.difficulty}`;
  $("question-text").textContent = q.question;

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
}

function handleAnswer(selectedIndex) {
  if (state.answered) return;
  state.answered = true;

  const q = state.questions[state.currentIndex];
  const isCorrect = selectedIndex === q.correctAnswer;
  if (isCorrect) {
    state.score += POINTS_PER_QUESTION;
    state.correctCount += 1;
  }
  showFeedback(isCorrect, selectedIndex);
}

function showFeedback(isCorrect, selectedIndex) {
  const q = state.questions[state.currentIndex];
  const buttons = $("options").querySelectorAll(".option");
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correctAnswer) btn.classList.add("correct");
    else if (i === selectedIndex) btn.classList.add("wrong");
  });

  const feedback = $("feedback");
  feedback.className = `feedback ${isCorrect ? "correct" : "wrong"}`;
  $("feedback-title").textContent = isCorrect
    ? "정답입니다!"
    : `오답입니다. 정답: ${q.options[q.correctAnswer]}`;
  $("feedback-explanation").textContent = q.explanation;
  $("score-text").textContent = `점수: ${state.score}`;

  const isLast = state.currentIndex === state.questions.length - 1;
  $("next-btn").textContent = isLast ? "결과 보기" : "다음 문제";
  $("next-btn").classList.remove("hidden");
  $("next-btn").focus();
}

function nextQuestion() {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex += 1;
    loadQuestion();
  } else {
    endGame();
  }
}

function endGame() {
  const total = state.questions.length;
  $("progress-fill").style.width = "100%";
  $("result-score").textContent = `${state.score}점`;
  $("result-detail").textContent = `${total}문제 중 ${state.correctCount}문제 정답 (${Math.round((state.correctCount / total) * 100)}%)`;
  showScreen("result");
}

// 숫자키 1~4로 답 선택, Enter로 다음 문제
document.addEventListener("keydown", (e) => {
  if (!$("quiz-screen").classList.contains("active")) return;
  if (!state.answered && ["1", "2", "3", "4"].includes(e.key)) {
    handleAnswer(Number(e.key) - 1);
  }
});

renderCategoryOptions();
$("start-btn").addEventListener("click", initGame);
$("next-btn").addEventListener("click", nextQuestion);
$("restart-btn").addEventListener("click", () => showScreen("start"));

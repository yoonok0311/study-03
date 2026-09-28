// 게임 모드 (timeLimit: 문제당 제한 시간(초), null이면 제한 없음)
const gameModes = {
    full: { name: '🏆 전체 도전', questions: 40, timeLimit: null, description: '카테고리마다 10문제씩, 모두 40문제' },
    category: { name: '📚 카테고리 도전', questions: 10, timeLimit: null, description: '고른 카테고리에서 10문제' },
    speed: { name: '⚡ 스피드 퀴즈', questions: 20, timeLimit: 15, description: '전체에서 20문제, 문제당 15초' }
};

const HINTS_PER_GAME = 3;
const HINT_REMOVE_COUNT = 2;

// 문제 데이터에 나오는 순서대로 카테고리 목록
const categories = [...new Set(quizQuestions.map(q => q.category))];

const scoreManager = new ScoreManager();

// 게임 상태 관리
let gameState = createGameState('full', null, []);

function createGameState(mode, category, questions) {
    return {
        mode: mode,
        category: category,
        questions: questions,
        currentQuestionIndex: 0,
        score: 0,
        correctAnswers: 0,
        answers: [],          // 답한 문제마다 { questionId, category, selected, correct, isCorrect, timeSpent, hintUsed, points }
        streak: 0,
        longestStreak: 0,
        hintsLeft: HINTS_PER_GAME,
        hintUsed: false,      // 현재 문제에서 힌트를 썼는지
        removedOptions: [],   // 힌트로 지운 선택지 인덱스
        isAnswered: false,
        isPaused: false,
        questionStart: 0,     // performance.now() 기준
        pauseStart: 0,
        pausedTotal: 0,       // 현재 문제에서 일시정지로 흐른 시간(ms)
        timerId: null,
        endedEarly: false
    };
}

// DOM 요소들
const startScreen = document.getElementById('startScreen');
const quizScreen = document.getElementById('quizScreen');
const resultScreen = document.getElementById('resultScreen');
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const restartBtn = document.getElementById('restartBtn');
const feedbackModal = document.getElementById('feedbackModal');
const shuffleCheck = document.getElementById('shuffleCheck');
const modeList = document.getElementById('modeList');
const categoryField = document.getElementById('categoryField');
const categorySelect = document.getElementById('categorySelect');
const hintBtn = document.getElementById('hintBtn');
const pauseBtn = document.getElementById('pauseBtn');
const pauseOverlay = document.getElementById('pauseOverlay');
const timerText = document.getElementById('timerText');

// 시작 화면의 모드 선택과 카테고리 목록
function renderStartOptions() {
    Object.entries(gameModes).forEach(([key, mode], i) => {
        const label = document.createElement('label');
        label.className = 'mode-option';
        label.innerHTML = `
            <input type="radio" name="mode" value="${key}" ${i === 0 ? 'checked' : ''}>
            <span class="mode-name">${mode.name}</span>
            <span class="mode-desc">${mode.description}</span>`;
        modeList.appendChild(label);
    });
    modeList.addEventListener('change', () => {
        categoryField.classList.toggle('hidden', selectedMode() !== 'category');
    });

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
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
// 원본 quizQuestions는 그대로 두고 복사본을 사용
function pickQuestions(modeKey, category, shuffleOrder) {
    const mode = gameModes[modeKey];
    const byCategory = cat => quizQuestions.filter(q => q.category === cat);
    let picked;

    if (modeKey === 'full') {
        const perCategory = Math.floor(mode.questions / categories.length);
        picked = categories.flatMap(cat => shuffle(byCategory(cat)).slice(0, perCategory));
    } else if (modeKey === 'category') {
        picked = shuffle(byCategory(category)).slice(0, mode.questions);
    } else {
        picked = shuffle([...quizQuestions]).slice(0, mode.questions);
    }

    return shuffleOrder ? shuffle(picked) : picked.sort((a, b) => a.id - b.id);
}

// 게임 초기화
function initGame() {
    const mode = selectedMode();
    const category = mode === 'category' ? categorySelect.value : null;
    gameState = createGameState(mode, category, pickQuestions(mode, category, shuffleCheck.checked));

    // 화면 전환
    startScreen.classList.remove('active');
    quizScreen.classList.add('active');
    resultScreen.classList.remove('active');
    feedbackModal.classList.remove('show');
    pauseOverlay.classList.add('hidden');
    document.getElementById('timeBar').classList.toggle('hidden', !timeLimit());

    // 첫 문제 로드
    loadQuestion();
}

function timeLimit() {
    return gameModes[gameState.mode].timeLimit;
}

// 문제 로드 및 표시
function loadQuestion() {
    const question = gameState.questions[gameState.currentQuestionIndex];

    // 상태 초기화
    gameState.isAnswered = false;
    gameState.hintUsed = false;
    gameState.removedOptions = [];

    // 진행률 업데이트
    updateProgress();

    // 카테고리 배지 업데이트
    document.getElementById('categoryBadge').textContent = question.category;
    updateComboBadge();

    // 문제 텍스트 표시
    document.getElementById('questionText').textContent = question.question;

    // 선택지 생성
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.onclick = () => handleAnswer(index);
        optionsContainer.appendChild(button);
    });

    updateToolButtons();
    startTimer();
}

// ----- 타이머 -----

// 현재 문제에서 흐른 시간(초). 일시정지한 시간은 빼고 셈
function elapsedSeconds() {
    const now = gameState.isPaused ? gameState.pauseStart : performance.now();
    return (now - gameState.questionStart - gameState.pausedTotal) / 1000;
}

function startTimer() {
    stopTimer();
    gameState.questionStart = performance.now();
    gameState.pausedTotal = 0;
    renderTimer();
    gameState.timerId = setInterval(tick, 100);
}

function stopTimer() {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
}

function tick() {
    if (gameState.isPaused || gameState.isAnswered) return;
    renderTimer();
    const limit = timeLimit();
    if (limit && elapsedSeconds() >= limit) handleAnswer(null);
}

function renderTimer() {
    const limit = timeLimit();
    const elapsed = elapsedSeconds();

    if (limit) {
        const remaining = Math.max(0, limit - elapsed);
        timerText.textContent = `⏱ ${Math.ceil(remaining)}초`;
        timerText.classList.toggle('warning', remaining <= 5);
        document.getElementById('timeFill').style.width = `${(remaining / limit) * 100}%`;
    } else {
        timerText.textContent = `⏱ ${Math.floor(elapsed)}초`;
        timerText.classList.remove('warning');
    }
}

// ----- 일시정지 -----

// 답하기 전에만 일시정지할 수 있음 (답한 뒤에는 타이머가 이미 멈춰 있음)
function togglePause() {
    if (gameState.isPaused) {
        gameState.pausedTotal += performance.now() - gameState.pauseStart;
        gameState.isPaused = false;
        pauseOverlay.classList.add('hidden');
    } else {
        if (gameState.isAnswered) return;
        gameState.pauseStart = performance.now();
        gameState.isPaused = true;
        pauseOverlay.classList.remove('hidden');
        document.getElementById('resumeBtn').focus();
    }
}

function quitGame() {
    gameState.isPaused = false;
    gameState.endedEarly = true;
    pauseOverlay.classList.add('hidden');
    endGame();
}

// ----- 힌트 -----

function updateToolButtons() {
    hintBtn.textContent = `💡 힌트 (${gameState.hintsLeft})`;
    hintBtn.disabled = gameState.hintsLeft === 0 || gameState.hintUsed || gameState.isAnswered;
    pauseBtn.disabled = gameState.isAnswered;
}

// 오답 중 HINT_REMOVE_COUNT개를 무작위로 지움
function useHint() {
    if (gameState.isAnswered || gameState.isPaused || gameState.hintUsed || gameState.hintsLeft === 0) return;

    const question = gameState.questions[gameState.currentQuestionIndex];
    const wrongIndexes = question.options.map((_, i) => i).filter(i => i !== question.correctAnswer);
    const buttons = document.querySelectorAll('.option-btn');

    shuffle(wrongIndexes).slice(0, HINT_REMOVE_COUNT).forEach(i => {
        gameState.removedOptions.push(i);
        buttons[i].classList.add('disabled', 'removed');
    });

    gameState.hintUsed = true;
    gameState.hintsLeft--;
    updateToolButtons();
}

// ----- 답변 처리 -----

// selectedIndex가 null이면 시간 초과
function handleAnswer(selectedIndex) {
    if (gameState.isAnswered || gameState.isPaused) return;
    if (gameState.removedOptions.includes(selectedIndex)) return;

    gameState.isAnswered = true;
    stopTimer();

    const question = gameState.questions[gameState.currentQuestionIndex];
    const isCorrect = selectedIndex === question.correctAnswer;
    const limit = timeLimit();
    const timeSpent = limit ? Math.min(elapsedSeconds(), limit) : elapsedSeconds();

    // 연속 정답 처리
    if (isCorrect) {
        gameState.correctAnswers++;
        gameState.streak++;
        gameState.longestStreak = Math.max(gameState.longestStreak, gameState.streak);
    } else {
        gameState.streak = 0;
    }

    const breakdown = scoreManager.getBreakdown(isCorrect, timeSpent, gameState.streak, gameState.hintUsed);
    const points = breakdown.base + breakdown.time + breakdown.noHint + breakdown.combo;
    gameState.score += points;

    // 답변 저장
    gameState.answers.push({
        questionId: question.id,
        category: question.category,
        selected: selectedIndex,
        correct: question.correctAnswer,
        isCorrect: isCorrect,
        timeSpent: timeSpent,
        hintUsed: gameState.hintUsed,
        points: points
    });

    // UI 피드백
    renderTimer();
    updateProgress();
    updateComboBadge();
    updateToolButtons();
    showAnswerFeedback(selectedIndex, question.correctAnswer, isCorrect);

    // 피드백 모달 표시
    setTimeout(() => {
        showFeedback(isCorrect, selectedIndex === null, question.explanation, describePoints(isCorrect, breakdown, points));
    }, 1000);
}

function updateComboBadge() {
    const comboBadge = document.getElementById('comboBadge');
    comboBadge.textContent = `🔥 ${gameState.streak}연속 정답`;
    comboBadge.classList.toggle('hidden', gameState.streak < 2);
}

function describePoints(isCorrect, breakdown, points) {
    if (!isCorrect) return '+0점';
    const parts = [`기본 ${breakdown.base}`];
    if (breakdown.time) parts.push(`빠른 답변 +${breakdown.time}`);
    if (breakdown.noHint) parts.push(`노힌트 +${breakdown.noHint}`);
    if (breakdown.combo) parts.push(`${gameState.streak}연속 콤보 +${breakdown.combo}`);
    return `+${points}점 (${parts.join(' · ')})`;
}

// 답변 피드백 UI
function showAnswerFeedback(selectedIndex, correctIndex, isCorrect) {
    const buttons = document.querySelectorAll('.option-btn');

    // 모든 버튼 비활성화
    buttons.forEach(btn => btn.classList.add('disabled'));

    // 선택한 답변 표시 (시간 초과면 정답만 표시)
    buttons[correctIndex].classList.add('correct');
    if (!isCorrect && selectedIndex !== null) {
        buttons[selectedIndex].classList.add('incorrect');
    }
}

// 피드백 모달 표시
function showFeedback(isCorrect, isTimeout, explanation, pointsText) {
    const feedbackIcon = document.getElementById('feedbackIcon');
    const feedbackTitle = document.getElementById('feedbackTitle');
    const feedbackExplanation = document.getElementById('feedbackExplanation');

    feedbackIcon.className = `feedback-icon ${isCorrect ? 'correct' : isTimeout ? 'timeout' : 'incorrect'}`;
    feedbackTitle.textContent = isCorrect ? '정답입니다!' : isTimeout ? '시간 초과!' : '틀렸습니다';
    document.getElementById('feedbackPoints').textContent = pointsText;
    feedbackExplanation.textContent = explanation;

    const isLast = gameState.currentQuestionIndex === gameState.questions.length - 1;
    nextBtn.textContent = isLast ? '결과 보기' : '다음 문제';

    feedbackModal.classList.add('show');
}

// 다음 문제로 이동
function nextQuestion() {
    feedbackModal.classList.remove('show');
    gameState.currentQuestionIndex++;

    if (gameState.currentQuestionIndex < gameState.questions.length) {
        loadQuestion();
    } else {
        endGame();
    }
}

// 게임 종료
function endGame() {
    stopTimer();

    // 화면 전환
    quizScreen.classList.remove('active');
    resultScreen.classList.add('active');

    // 결과 표시
    displayResults();
}

// 답한 문제 기록으로 결과 통계를 만듦 (중간에 그만두면 답한 문제까지만)
function buildResult() {
    const answers = gameState.answers;
    const total = answers.length;
    const correct = answers.filter(a => a.isCorrect).length;

    const categoryStats = {};
    answers.forEach(a => {
        if (!categoryStats[a.category]) categoryStats[a.category] = { correct: 0, total: 0 };
        categoryStats[a.category].total++;
        if (a.isCorrect) categoryStats[a.category].correct++;
    });

    const totalTime = answers.reduce((sum, a) => sum + a.timeSpent, 0);

    return {
        totalScore: gameState.score,
        correctAnswers: correct,
        totalQuestions: total,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
        categoryStats: categoryStats,
        averageResponseTime: total ? Math.round((totalTime / total) * 10) / 10 : 0,
        longestStreak: gameState.longestStreak,
        hintsUsed: HINTS_PER_GAME - gameState.hintsLeft
    };
}

// 결과 표시
function displayResults() {
    const result = buildResult();
    const mode = gameModes[gameState.mode];

    document.getElementById('resultMode').textContent =
        (gameState.category ? `${mode.name} · ${gameState.category}` : mode.name) +
        (gameState.endedEarly ? ` (전체 ${gameState.questions.length}문제 중 중간 종료)` : '');

    document.getElementById('finalScore').textContent = result.totalScore;
    document.getElementById('correctCount').textContent = `${result.correctAnswers} / ${result.totalQuestions}`;
    document.getElementById('accuracyRate').textContent = `${result.accuracy}%`;
    document.getElementById('avgTime').textContent = `${result.averageResponseTime}초`;
    document.getElementById('longestStreak').textContent = result.longestStreak;
    document.getElementById('hintsUsed').textContent = `${result.hintsUsed} / ${HINTS_PER_GAME}`;

    // 카테고리별 결과
    const categoryResults = document.getElementById('categoryResults');
    categoryResults.innerHTML = '';

    categories.filter(category => result.categoryStats[category]).forEach(category => {
        const scores = result.categoryStats[category];

        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-result';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'category-name';
        nameSpan.textContent = category;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'category-score';
        scoreSpan.textContent = `${scores.correct} / ${scores.total} (${Math.round((scores.correct / scores.total) * 100)}%)`;

        categoryDiv.appendChild(nameSpan);
        categoryDiv.appendChild(scoreSpan);
        categoryResults.appendChild(categoryDiv);
    });
}

// 진행률 업데이트
function updateProgress() {
    const current = gameState.currentQuestionIndex + 1;
    const total = gameState.questions.length;

    document.getElementById('currentQuestion').textContent = current;
    document.getElementById('totalQuestions').textContent = total;
    document.getElementById('currentScore').textContent = gameState.score;

    // 진행률 바 업데이트
    document.getElementById('progressFill').style.width = `${(current / total) * 100}%`;
}

// 게임 재시작
function restartGame() {
    resultScreen.classList.remove('active');
    startScreen.classList.add('active');
}

// 이벤트 리스너
startBtn.addEventListener('click', () => {
    initGame();
});

nextBtn.addEventListener('click', nextQuestion);
restartBtn.addEventListener('click', restartGame);
hintBtn.addEventListener('click', useHint);
pauseBtn.addEventListener('click', togglePause);
document.getElementById('resumeBtn').addEventListener('click', togglePause);
document.getElementById('quitBtn').addEventListener('click', quitGame);

// 키보드 단축키 지원 (한글 입력 상태에서도 동작하도록 H, P는 e.code로 확인)
document.addEventListener('keydown', (e) => {
    if (!quizScreen.classList.contains('active')) return;

    if (e.code === 'KeyP' || e.code === 'Escape') {
        togglePause();
        return;
    }
    if (gameState.isPaused) return;

    if (!gameState.isAnswered) {
        // 1-4 숫자키로 답변 선택, H로 힌트
        if (e.key >= '1' && e.key <= '4') {
            handleAnswer(parseInt(e.key) - 1);
        } else if (e.code === 'KeyH') {
            useHint();
        }
    } else if (feedbackModal.classList.contains('show')) {
        // Enter 키로 다음 문제
        if (e.key === 'Enter') {
            e.preventDefault();
            nextQuestion();
        }
    }
});

renderStartOptions();

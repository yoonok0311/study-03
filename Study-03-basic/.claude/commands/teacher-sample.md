---
description: 선생님 모드 - 연습용 가상 학생 기록 파일 만들기
argument-hint: "[학생 수 3~30, 비우면 8] [학생당 판 수 3~30, 비우면 8]"
---
<!-- Created: 2026-09-28 18:06 -->

선생님 모드 명령어(`/teacher-collect`, `/teacher-overview`, `/teacher-compare`, `/teacher-weak`, `/teacher-report`)를 실제 학생 기록 없이 시험해 볼 수 있도록 가상 학생의 기록 파일을 만듭니다. 입력: $ARGUMENTS

* 입력은 학생 수와 학생당 판 수입니다. 비우면 각각 8이고, 3~30의 정수만 받습니다. 그 밖의 입력이면 사용법(`/teacher-sample [학생 수 3~30] [학생당 판 수 3~30]`)을 보여 주고 멈춥니다.
* 스크립트는 `Study-03-basic` 폴더에서 Node로 실행합니다. 셸 heredoc은 `\\`를 바꿀 수 있으므로 Write 도구로 임시 파일(scratchpad)에 저장해 실행합니다. 대문자 상수(`STUDENTS`, `GAMES`)는 입력 값으로 채웁니다.
* 결과 파일은 `teacher/sample/`에 만들고, 그 폴더의 이전 `quiz-history-*.json`은 지웁니다. `teacher/`는 저장소 루트 `.gitignore`에 들어 있어야 합니다 (없으면 `# 선생님 모드 학생 기록 (학생 이름 포함)` 주석과 함께 `Study-03-basic/teacher/`를 먼저 추가).
* 커밋은 하지 않습니다.

## 만드는 데이터

* 학생마다 파일 하나(`quiz-history-이름.json`). 형식은 게임이 `localStorage`의 `quizBasic.history`에 저장하는 기록 배열과 같아서, 실제 학생이 "기록 내보내기"로 보낸 파일처럼 다룰 수 있습니다.
* 게임은 실제 규칙대로 흉내 냅니다: 모드별 문제 수(전체 도전 40, 카테고리 도전 10, 스피드 15초 제한 20), 문제 난이도(전체/쉬움/어려움), 힌트 3회, 중간 종료, 점수는 `index.html`의 `ScoreManager`로 계산.
* 학생마다 카테고리별 실력, 응답 속도, 힌트 습관, 실력 변화가 다릅니다. 2번째 학생은 점점 떨어지고, 마지막 학생은 10일 넘게 플레이하지 않은 것으로 만들어 `📉`, `💤` 표시를 시험할 수 있습니다.
* `quiz-history-공용PC.json`은 여러 학생이 함께 쓴 컴퓨터를 흉내 냅니다: 다른 파일과 겹치는 기록 2개(중복 제거 시험)와 이름 뒤에 공백이 붙은 기록 1개(이름 정리 시험).
* 난수 시드가 고정이라 기록 내용은 매번 같고, 시각만 실행 시점을 기준으로 최근 2주에 퍼집니다. 이름은 가상의 이름입니다.

## 스크립트

```js
const fs = require('fs'), vm = require('vm'), path = require('path');
const STUDENTS = 8;  // 학생 수 (3~30)
const GAMES = 8;     // 학생당 판 수 (3~30)
const OUT = path.join('teacher', 'sample');
const fail = m => { console.log('실패: ' + m); process.exit(1); };
if (![STUDENTS, GAMES].every(n => Number.isInteger(n) && n >= 3 && n <= 30)) fail('학생 수와 판 수는 3~30의 정수');
if (!fs.readFileSync('../.gitignore', 'utf8').split(/\r?\n/).some(l => /^\/?(Study-03-basic\/)?teacher\/?$/.test(l.trim()))) fail('.gitignore에 Study-03-basic/teacher/가 없음 (학생 이름이 저장소에 올라갈 수 있음)');
const html = fs.readFileSync('index.html', 'utf8');
const plain = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const ctx = { module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(plain[0] + ';this.q = quizQuestions;', ctx);
vm.runInContext(plain[1], ctx);
const CATS = [...new Set(ctx.q.map(x => x.category))], scorer = new ctx.module.exports.ScoreManager();

let seed = 20260928;  // 고정 시드 (mulberry32)
const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rand() * a.length)];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const NAMES = ['민준', '서연', '도윤', '하은', '시우', '지유', '주원', '서윤', '예준', '하린', '지호', '수아', '건우', '지안', '우진',
  '윤서', '선우', '채원', '현우', '다은', '유준', '소율', '은우', '예린', '정우', '시아', '이준', '나윤', '승민', '가은'];
const MODES = { full: { n: 40, limit: null }, category: { n: 10, limit: null }, speed: { n: 20, limit: 15 } };

// 한 판을 흉내 내서 게임이 저장하는 것과 같은 필드 순서의 기록을 만듦
function play(s, g, when) {
  const mode = pick(['full', 'full', 'category', 'category', 'speed']), level = pick(['all', 'all', 'all', 'easy', 'hard']);
  const category = mode === 'category' ? pick(CATS) : null, { n, limit } = MODES[mode];
  const cats = mode === 'full' ? CATS.flatMap(c => Array(n / CATS.length).fill(c)) : Array.from({ length: n }, () => category || pick(CATS));
  const stop = rand() < s.quit ? 1 + Math.floor(rand() * (n - 1)) : n;
  let score = 0, streak = 0, longest = 0, hints = 3, time = 0, correct = 0;
  const categoryStats = {};
  cats.slice(0, stop).forEach(c => {
    const hint = hints > 0 && rand() < s.hint;
    if (hint) hints--;
    let t = Math.round(s.speed * (0.5 + rand()) * 10) / 10;
    const p = s.skill[c] + s.growth * g + (level === 'easy' ? 0.1 : level === 'hard' ? -0.12 : 0) + (hint ? 0.25 : 0);
    let ok = rand() < clamp(p, 0.05, 0.98);
    if (limit && t >= limit) { t = limit; ok = false; }
    streak = ok ? streak + 1 : 0;
    longest = Math.max(longest, streak);
    score += scorer.calculateScore(ok, t, streak, hint);
    time += t;
    if (ok) correct++;
    const cs = categoryStats[c] || (categoryStats[c] = { correct: 0, total: 0 });
    cs.total++;
    if (ok) cs.correct++;
  });
  return {
    totalScore: score, correctAnswers: correct, totalQuestions: stop, accuracy: Math.round(correct / stop * 100), categoryStats,
    averageResponseTime: Math.round(time / stop * 10) / 10, longestStreak: longest, hintsUsed: 3 - hints,
    name: s.name, mode, category, level, plannedQuestions: n, endedEarly: stop < n,
    id: `${when.getTime()}-${Math.floor(rand() * 36 ** 6).toString(36).padStart(6, '0')}`, timestamp: when.toISOString()
  };
}

const now = Date.now(), DAY = 864e5;
const students = NAMES.slice(0, STUDENTS).map((name, i) => {
  const base = 0.45 + rand() * 0.4;
  return {
    name, skill: Object.fromEntries(CATS.map(c => [c, clamp(base + (rand() - 0.5) * 0.35, 0.2, 0.95)])),
    speed: 4 + rand() * 7, hint: rand() * 0.12, quit: rand() * 0.2,
    growth: i === 1 ? -0.025 : rand() * 0.02, idle: i === STUDENTS - 1
  };
});
const files = {};
students.forEach(s => {
  const [from, to] = s.idle ? [24, 10] : [14, 0];  // 며칠 전부터 며칠 전까지
  const times = Array.from({ length: GAMES }, () => now - (to + rand() * (from - to)) * DAY).sort((a, b) => a - b);
  files[`quiz-history-${s.name}.json`] = times.map((t, g) => play(s, g, new Date(t)));
});
const shared = students.slice(0, 2).map(s => files[`quiz-history-${s.name}.json`][0]);
const extra = play(students[2], GAMES, new Date(now - rand() * DAY));
files['quiz-history-공용PC.json'] = [...shared, { ...extra, name: students[2].name + ' ' }];

fs.mkdirSync(OUT, { recursive: true });
const old = fs.readdirSync(OUT).filter(f => /^quiz-history-.*\.json$/.test(f));
old.forEach(f => fs.unlinkSync(path.join(OUT, f)));
Object.entries(files).forEach(([f, recs]) => fs.writeFileSync(path.join(OUT, f), JSON.stringify(recs)));
Object.entries(files).forEach(([f, recs]) => {
  const back = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
  if (back.length !== recs.length) fail(`${f}를 다시 읽은 기록 수가 다름`);
  const acc = Math.round(recs.reduce((a, r) => a + r.correctAnswers, 0) / recs.reduce((a, r) => a + r.totalQuestions, 0) * 100);
  console.log(`  ${f}: ${recs.length}판, 정답률 ${acc}%, 중간 종료 ${recs.filter(r => r.endedEarly).length}판`);
});
console.log(`샘플 생성 완료: ${OUT} (학생 ${STUDENTS}명 × ${GAMES}판 + 공용PC 3판, 지운 이전 파일 ${old.length}개)`);
```

**통과 조건**: `샘플 생성 완료`가 출력됨. `실패:`가 나오면 그 줄을 그대로 보고하고 멈춥니다.

**보고**: 만든 폴더, 파일마다 판 수·정답률·중간 종료 수 표, 시험용으로 넣은 특징(하락하는 학생, 쉬는 학생, 공용PC의 중복·이름 공백)을 적고, 다음 명령으로 `/teacher-collect teacher/sample`을 안내합니다.

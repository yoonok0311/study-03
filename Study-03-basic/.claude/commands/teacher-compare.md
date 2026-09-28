---
description: 선생님 모드 - 학생 2~6명을 항목별로 나란히 비교 (카테고리, 난이도, 게임 종류별 점수, 최근 추이)
argument-hint: "<학생 이름 2~6명>"
---
<!-- Created: 2026-09-28 18:06 -->

`teacher/class.json`(`/teacher-collect`로 만든 반 기록)에서 고른 학생들의 성적을 항목마다 나란히 놓고 반 평균과 비교합니다. 입력: $ARGUMENTS

* 입력은 공백으로 나눈 학생 이름 2~6개입니다. 이름에 공백이 있으면 따옴표로 묶어 받습니다. 개수가 맞지 않으면 사용법(`/teacher-compare 이름1 이름2 [... 이름6]`)을 보여 주고 멈춥니다.
* 스크립트는 `Study-03-basic` 폴더에서 Node로 실행합니다. 셸 heredoc은 `\\`를 바꿀 수 있으므로 Write 도구로 임시 파일(scratchpad)에 저장해 실행합니다. 대문자 상수 `NAMES`는 입력 값으로 채웁니다.
* 파일을 수정하지 않습니다.

## 비교 항목

* 전체: 판 수, 푼 문제, 정답률, 평균 응답 시간(문제 수로 가중 평균), 판당 힌트, 최장 연속 정답, 추이(앞쪽 절반 판 → 뒤쪽 절반 판 정답률 차이, 4판 이상)
* 카테고리별 정답률, 문제 난이도(전체/쉬움/어려움)별 정답률, 게임 모드별 정답률
* 게임 종류·난이도별 최고 점수 (끝까지 푼 게임만, 순위표와 같은 `getPersonalBest`). 점수는 같은 게임 종류 안에서만 비교합니다.
* 최근 5판의 정답률
* `반 평균`은 반 모든 학생의 값을 평균한 것이고(그 항목에 기록이 있는 학생만), `★`는 고른 학생 중 가장 좋은 값입니다 (응답 시간은 짧을수록, 판 수·푼 문제·힌트는 표시하지 않음).

## 스크립트

```js
const fs = require('fs'), vm = require('vm');
const NAMES = [];  // 비교할 학생 이름 2~6명
const CLASS = 'teacher/class.json';
const fail = m => { console.log('실패: ' + m); process.exit(1); };
const html = fs.readFileSync('index.html', 'utf8');
const plain = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const ctx = { module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(plain[0] + ';this.q = quizQuestions;', ctx);
vm.runInContext(plain.find(s => s.includes('class LocalDataManager')), ctx);
const R = ctx.module.exports;
if (!fs.existsSync(CLASS)) fail(`${CLASS}가 없음. 먼저 /teacher-collect로 학생 기록을 모으세요.`);
const all = JSON.parse(fs.readFileSync(CLASS, 'utf8')).records;
const names = R.getPlayerNames(all);
const norm = s => String(s).normalize('NFC').trim().replace(/\s+/g, ' ');
const pickNames = [...new Set(NAMES.map(norm))];
if (pickNames.length < 2 || pickNames.length > 6) fail(`비교할 학생은 서로 다른 2~6명 (받은 ${pickNames.length}명). 있는 이름: ${names.join(', ')}`);
const missing = pickNames.filter(n => !names.includes(n));
if (missing.length) fail(`기록에 없는 이름: ${missing.map(n => { const like = names.filter(x => x.includes(n) || n.includes(x)); return like.length ? `${n} (비슷한 이름: ${like.join(', ')})` : n; }).join(', ')} / 있는 이름: ${names.join(', ')}`);

const CATS = [...new Set(ctx.q.map(x => x.category))];
const MODES = { full: '전체 도전', category: '카테고리 도전', speed: '스피드 퀴즈' }, LEVELS = { all: '전체', easy: '쉬움', hard: '어려움' };
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const accOf = a => { const t = sum(a, x => x.totalQuestions); return t ? Math.round(sum(a, x => x.correctAnswers) / t * 100) : null; };
const catAcc = (a, c) => { const t = sum(a, x => (x.categoryStats?.[c]?.total || 0)); return t ? Math.round(sum(a, x => (x.categoryStats?.[c]?.correct || 0)) / t * 100) : null; };
const boardLabel = k => (k.startsWith('category:') ? `카테고리 도전 · ${k.slice(9)}` : MODES[k]);
// 고른 학생 중 누군가 끝까지 푼 게임 종류·난이도만
const boards = [...new Set(all.filter(h => pickNames.includes(h.name) && !h.endedEarly).map(h => `${R.boardKeyOf(h)}|${h.level}`))].sort();

// [항목 이름, 기록 → 값, 단위, 좋은 방향(high/low/null)]
const metrics = [
  ['판 수', a => a.length, '', null],
  ['푼 문제', a => sum(a, x => x.totalQuestions), '', null],
  ['정답률', accOf, '%', 'high'],
  ['평균 응답', a => Math.round(sum(a, x => (x.averageResponseTime || 0) * x.totalQuestions) / sum(a, x => x.totalQuestions) * 10) / 10, '초', 'low'],
  ['판당 힌트', a => Math.round(sum(a, x => x.hintsUsed || 0) / a.length * 10) / 10, '회', null],
  ['최장 연속 정답', a => Math.max(...a.map(x => x.longestStreak || 0)), '', 'high'],
  ['추이 (앞 절반 → 뒤 절반)', a => (a.length >= 4 ? accOf(a.slice(-Math.floor(a.length / 2))) - accOf(a.slice(0, Math.floor(a.length / 2))) : null), '%p', 'high'],
  ...CATS.map(c => [`정답률 · ${c}`, a => catAcc(a, c), '%', 'high']),
  ...Object.entries(LEVELS).map(([k, v]) => [`정답률 · 난이도 ${v}`, a => accOf(a.filter(x => x.level === k)), '%', 'high']),
  ...Object.entries(MODES).map(([k, v]) => [`정답률 · ${v}`, a => accOf(a.filter(x => x.mode === k)), '%', 'high']),
  ...boards.map(k => { const [b, l] = k.split('|'); return [`최고 점수 · ${boardLabel(b)} · ${LEVELS[l]}`, a => { const best = R.getPersonalBest(a, a[0]?.name, b, l); return best ? best.totalScore : null; }, '점', 'high']; })
];
const of = n => all.filter(h => h.name === n);
const fmt = (v, u) => (v === null || v === undefined || Number.isNaN(v) ? '-' : (u === '%p' && v > 0 ? '+' : '') + v + u);
console.log(`[비교] ${pickNames.join(', ')} (반 학생 ${names.length}명)`);
console.log(`항목 | ${pickNames.join(' | ')} | 반 평균`);
const spreads = [];
metrics.forEach(([label, f, unit, better]) => {
  const vals = pickNames.map(n => f(of(n)));
  const classVals = names.map(n => f(of(n))).filter(v => v !== null && !Number.isNaN(v));
  const classAvg = classVals.length ? Math.round(sum(classVals, x => x) / classVals.length * 10) / 10 : null;
  const nums = vals.filter(v => v !== null && !Number.isNaN(v));
  const top = better && nums.length > 1 && new Set(nums).size > 1 ? (better === 'high' ? Math.max(...nums) : Math.min(...nums)) : null;
  if (unit === '%' && nums.length > 1) spreads.push([label, Math.max(...nums) - Math.min(...nums), pickNames.filter((n, i) => vals[i] === Math.max(...nums)), pickNames.filter((n, i) => vals[i] === Math.min(...nums))]);
  console.log(`${label} | ${vals.map(v => fmt(v, unit) + (top !== null && v === top ? ' ★' : '')).join(' | ')} | ${fmt(classAvg, unit)}`);
});
console.log(`최근 5판 정답률 | ${pickNames.map(n => of(n).slice(-5).map(x => x.accuracy + '%').join(' → ')).join(' | ')} | -`);
console.log('[차이가 큰 정답률 항목] ' + spreads.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([l, d, hi, lo]) => `${l} ${d}%p (높음 ${hi.join(', ')} / 낮음 ${lo.join(', ')})`).join('; '));
console.log('비교 완료');
```

**통과 조건**: `비교 완료`가 출력됨. `실패:`가 나오면 그 줄(없는 이름이면 비슷한 이름과 있는 이름 목록 포함)을 그대로 보고하고 멈춥니다.

**보고**: 비교한 학생을 한 줄로 적고, `항목 | 학생들 | 반 평균` 줄을 마크다운 표로 옮깁니다 (전체 / 카테고리·난이도·모드 / 최고 점수 / 최근 5판으로 나눠도 됨). 이어서 학생마다 강점과 약점을 한 줄씩(반 평균 대비, ★ 항목, 가장 낮은 카테고리), 그리고 "차이가 큰 정답률 항목"을 바탕으로 짧은 해석을 적습니다. 기록이 없는 항목(`-`)은 비교하지 않았다고 적습니다.

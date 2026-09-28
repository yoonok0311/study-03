---
description: 선생님 모드 - 반 전체의 약한 카테고리·난이도와 카테고리별로 도움이 필요한 학생 찾기
argument-hint: "[카테고리 이름, 비우면 모든 카테고리]"
---
<!-- Created: 2026-09-28 18:06 -->

`teacher/class.json`(`/teacher-collect`로 만든 반 기록)으로 반 전체가 어느 카테고리와 난이도에서 약한지, 카테고리마다 어떤 학생에게 도움이 필요한지 찾습니다. 입력: $ARGUMENTS

* 입력은 카테고리 이름 하나이고 선택입니다 (`한국사`, `세계지리`, `과학`, `예술과 문화` 등 문제 데이터의 카테고리). 비우면 모든 카테고리를 봅니다. 없는 카테고리면 스크립트가 있는 카테고리 목록을 보여 주고 멈춥니다.
* 스크립트는 `Study-03-basic` 폴더에서 Node로 실행합니다. 셸 heredoc은 `\\`를 바꿀 수 있으므로 Write 도구로 임시 파일(scratchpad)에 저장해 실행합니다. 대문자 상수 `CATEGORY`는 입력 값으로 채웁니다.
* 파일을 수정하지 않습니다.

## 기준

* 카테고리 정답률은 기록의 `categoryStats`(판마다 카테고리별 정답/문제 수)를 모두 합쳐 계산합니다. **문제마다의 답은 기록에 저장되지 않으므로** 어느 문제를 많이 틀렸는지는 알 수 없습니다.
* 한 학생의 카테고리 정답률은 그 카테고리에서 `MIN_CAT`(5문제) 이상 풀었을 때만 판단합니다 (적으면 `(n문제)`로 표시하고 판단하지 않음).
* **도움 필요** `⚠`: 그 카테고리의 반 정답률보다 `LOW_GAP`(15%p) 이상 낮거나, 정답률이 `LOW_ABS`(50%) 미만
* 문제 난이도(게임 시작 때 고른 전체/쉬움/어려움)와 게임 모드별 반 정답률도 함께 봅니다. 쉬움과 어려움은 medium 문제가 겹치므로 차이가 실제 난이도 차이보다 작게 나올 수 있습니다.

## 스크립트

```js
const fs = require('fs'), vm = require('vm');
const CATEGORY = '';  // '' 모든 카테고리 | 카테고리 이름
const CLASS = 'teacher/class.json';
const LOW_GAP = 15, LOW_ABS = 50, MIN_CAT = 5;
const fail = m => { console.log('실패: ' + m); process.exit(1); };
const html = fs.readFileSync('index.html', 'utf8');
const plain = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const ctx = { module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(plain[0] + ';this.q = quizQuestions;', ctx);
vm.runInContext(plain.find(s => s.includes('class LocalDataManager')), ctx);
const R = ctx.module.exports;
if (!fs.existsSync(CLASS)) fail(`${CLASS}가 없음. 먼저 /teacher-collect로 학생 기록을 모으세요.`);
const all = JSON.parse(fs.readFileSync(CLASS, 'utf8')).records;
const known = [...new Set([...ctx.q.map(x => x.category), ...all.flatMap(h => Object.keys(h.categoryStats || {}))])];
if (CATEGORY && !known.includes(CATEGORY)) fail(`없는 카테고리: ${CATEGORY} / 있는 카테고리: ${known.join(', ')}`);
const CATS = CATEGORY ? [CATEGORY] : known;
const names = R.getPlayerNames(all).sort((a, b) => a.localeCompare(b, 'ko'));

const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const pct = (c, t) => (t ? Math.round(c / t * 100) : null);
const cat = (a, c) => ({ correct: sum(a, h => h.categoryStats?.[c]?.correct || 0), total: sum(a, h => h.categoryStats?.[c]?.total || 0) });
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2)) : null; };
const of = n => all.filter(h => h.name === n);

const catRows = CATS.map(c => {
  const cls = cat(all, c), classAcc = pct(cls.correct, cls.total);
  const studs = names.map(n => ({ n, ...cat(of(n), c) })).map(s => ({ ...s, acc: pct(s.correct, s.total) }));
  const judged = studs.filter(s => s.total >= MIN_CAT);
  const weak = judged.filter(s => s.acc <= classAcc - LOW_GAP || s.acc < LOW_ABS).sort((a, b) => a.acc - b.acc);
  const hi = judged.length ? judged.reduce((a, b) => (b.acc > a.acc ? b : a)) : null, lo = judged.length ? judged.reduce((a, b) => (b.acc < a.acc ? b : a)) : null;
  return { c, classAcc, total: cls.total, studs, judged, weak, med: median(judged.map(s => s.acc)), hi, lo };
}).sort((a, b) => (a.classAcc ?? 101) - (b.classAcc ?? 101));

console.log(`[대상] ${CATEGORY || '모든 카테고리'} / 학생 ${names.length}명, 기록 ${all.length}판, 푼 문제 ${sum(all, h => h.totalQuestions)}`);
console.log('[카테고리별 반 정답률 (낮은 순)] 카테고리 | 반 정답률 | 푼 문제 | 판단한 학생 | 학생 중앙값 | 최고 학생 | 최저 학생 | 도움 필요');
catRows.forEach(r => console.log(`  ${r.c} | ${r.classAcc ?? '-'}% | ${r.total} | ${r.judged.length}명 | ${r.med ?? '-'}% | ${r.hi ? `${r.hi.n} ${r.hi.acc}%` : '-'} | ${r.lo ? `${r.lo.n} ${r.lo.acc}%` : '-'} | ${r.weak.length ? r.weak.map(s => `${s.n} ${s.acc}%`).join(', ') : '없음'}`));

const acc = a => pct(sum(a, h => h.correctAnswers), sum(a, h => h.totalQuestions));
const LEVELS = { all: '전체', easy: '쉬움', hard: '어려움' }, MODES = { full: '전체 도전', category: '카테고리 도전', speed: '스피드 퀴즈' };
const sub = (a, c) => (CATEGORY ? pct(cat(a, c).correct, cat(a, c).total) : acc(a));  // 카테고리를 골랐으면 그 카테고리 문제만
console.log('[문제 난이도별] ' + Object.entries(LEVELS).map(([k, v]) => { const a = all.filter(h => h.level === k); return `${v} ${a.length ? sub(a, CATEGORY) + '%' : '-'} (${a.length}판)`; }).join(', '));
console.log('[게임 모드별] ' + Object.entries(MODES).map(([k, v]) => { const a = all.filter(h => h.mode === k); return `${v} ${a.length ? sub(a, CATEGORY) + '%' : '-'} (${a.length}판)`; }).join(', '));

console.log(`[학생 × 카테고리] 이름 | ${CATS.join(' | ')} | 가장 약한 카테고리`);
names.forEach(n => {
  const cells = CATS.map(c => catRows.find(r => r.c === c)).map(r => {
    const s = r.studs.find(x => x.n === n);
    if (!s.total) return '-';
    if (s.total < MIN_CAT) return `(${s.total}문제)`;
    return `${s.acc}%${r.weak.some(w => w.n === n) ? ' ⚠' : ''}`;
  });
  const mine = catRows.map(r => r.studs.find(x => x.n === n)).filter(s => s.total >= MIN_CAT);
  const worst = CATS.length > 1 && mine.length ? mine.reduce((a, b) => (b.acc < a.acc ? b : a)) : null;
  console.log(`  ${n} | ${cells.join(' | ')} | ${worst ? `${catRows.find(r => r.studs.includes(worst)).c} ${worst.acc}%` : '-'}`);
});
console.log(`  (반) | ${CATS.map(c => { const r = catRows.find(x => x.c === c); return r.classAcc === null ? '-' : r.classAcc + '%'; }).join(' | ')} | -`);

const help = names.map(n => ({ n, cats: catRows.filter(r => r.weak.some(w => w.n === n)).map(r => `${r.c} ${r.weak.find(w => w.n === n).acc}%`) })).filter(x => x.cats.length).sort((a, b) => b.cats.length - a.cats.length);
console.log('[도움이 필요한 학생] ' + (help.length ? help.map(x => `${x.n}: ${x.cats.join(', ')}`).join(' / ') : '없음'));
const weakest = catRows.find(r => r.classAcc !== null);
if (weakest && CATS.length > 1) console.log(`[가장 약한 카테고리] ${weakest.c} (반 정답률 ${weakest.classAcc}%, 가장 높은 ${catRows.filter(r => r.classAcc !== null).pop().c} ${catRows.filter(r => r.classAcc !== null).pop().classAcc}%)`);
console.log('약점 분석 완료');
```

**통과 조건**: `약점 분석 완료`가 출력됨. `실패:`가 나오면 그 줄을 그대로 보고하고 멈춥니다.

**보고**: 대상을 한 줄로 적고 카테고리별 표, 난이도·모드별 정답률, 학생 × 카테고리 표(⚠ 칸 강조)를 마크다운으로 옮깁니다. 이어서 제안을 적습니다: 반 전체가 약한 카테고리는 수업에서 다시 다루기, 도움이 필요한 학생마다 `카테고리 도전 · 그 카테고리`(필요하면 문제 난이도 "쉬움")로 연습하기, 여러 카테고리에서 ⚠인 학생은 따로 상담하기. 판단하지 못한 칸(`(n문제)`)이 많으면 기록이 더 필요하다고 적습니다. 문제별 오답 분석은 기록에 없어 할 수 없다는 점도 알립니다.

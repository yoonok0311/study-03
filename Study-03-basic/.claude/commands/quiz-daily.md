---
description: 퀴즈 일일 점검 - 구조 확인, 분포 분석, 부족한 곳에 새 문제 추가, 검증, 백업, 보고
argument-hint: "[추가할 문제 수 1~5, 비우면 1]"
---
<!-- Created: 2026-09-28 17:50 -->

`index.html` 첫 번째 `<script>`의 `quizQuestions`를 점검하고, 가장 부족한 카테고리와 난이도에 새 문제를 추가한 뒤 전체 데이터를 백업합니다. 입력: $ARGUMENTS

* 입력은 추가할 문제 수입니다. 비어 있으면 1, 1~5의 정수만 받습니다. 그 밖의 입력이면 사용법(`/quiz-daily [추가할 문제 수 1~5, 비우면 1]`)을 보여 주고 멈춥니다.
* 모든 스크립트는 `Study-03-basic` 폴더에서 Node로 실행합니다. 스크립트 안의 대문자 상수(`N`, `PLAN`, `NEW`)는 앞 단계 결과로 채웁니다.
* 파일은 수정하지만 커밋은 하지 않습니다.

## 실패 처리 (모든 단계 공통)

단계마다 끝에 적힌 **통과 조건**을 확인합니다. 스크립트가 `실패:`로 시작하는 줄을 출력하거나 0이 아닌 코드로 끝나거나, 통과 조건을 하나라도 못 지키면 **그 자리에서 멈추고 다음 단계로 가지 않습니다.** 실패를 고쳐서 다시 시도하지도 않습니다.

멈출 때는 아래 형식으로 보고합니다.

```
❌ quiz-daily 중단: N단계 (단계 이름)
- 오류: 스크립트 출력 또는 어긋난 통과 조건 그대로
- 원인: 추정되는 원인 한두 줄
- 파일 상태: 수정 없음 | 복원함 (복원한 파일) | 복원 실패 (남은 변경 내용)
- 해결 방법: 사용자가 할 일 (예: /check-questions로 확인, 해당 id 수정)
- 완료된 단계: 1~(N-1)단계 결과 요약
```

5단계에서 파일을 고친 뒤에 실패하면, 멈추기 전에 5단계의 "복원" 절차로 파일을 되돌리고 복원 결과를 보고합니다.

## 1단계: 파일 구조 확인

```js
const fs = require('fs'), vm = require('vm');
const fail = m => { console.log('실패: ' + m); process.exit(1); };
if (!fs.existsSync('index.html')) fail('index.html이 없음 (Study-03-basic 폴더에서 실행해야 함)');
const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const plain = scripts.filter(m => !m[1]);
console.log(`<script> ${scripts.length}개 (속성 없는 것 ${plain.length}개)`);
const parts = [['문제 데이터', /const quizQuestions = \[/], ['점수 계산', /class ScoreManager\b/], ['기록 저장과 순위', /class LocalDataManager\b/], ['게임 로직', /const gameModes = \{/]];
if (plain.length !== parts.length) fail(`속성 없는 <script>가 ${parts.length}개가 아님`);
parts.forEach(([name, re], i) => {
  if (!re.test(plain[i][2])) fail(`${i + 1}번째 <script>에 ${name}(${re.source})가 없음`);
  console.log(`  ${i + 1}. ${name}: ${plain[i][2].split('\n').length}줄`);
});
const start = html.indexOf('const quizQuestions = [');
if (html.indexOf('\n        ];', start) < 0) fail('quizQuestions 배열의 끝(8칸 들여쓴 "];")을 찾지 못함');
const ctx = {}; vm.createContext(ctx);
try { vm.runInContext(plain[0][2] + ';this.q = quizQuestions;', ctx); } catch (e) { fail('문제 데이터 실행 오류: ' + e.message); }
const q = ctx.q;
if (!Array.isArray(q) || !q.length) fail('quizQuestions가 비어 있거나 배열이 아님');
const KEYS = 'id,category,difficulty,question,options,correctAnswer,explanation';
q.forEach(x => { if (Object.keys(x).join() !== KEYS) fail(`id ${x.id}: 필드가 ${KEYS} 순서가 아님 (${Object.keys(x).join()})`); });
const sections = [...plain[0][2].matchAll(/\/\/ (.+?) \((\d+)문제\)/g)].map(m => m[1]);
const cats = [...new Set(q.map(x => x.category))];
if (sections.join() !== cats.join()) fail(`섹션 주석 순서(${sections.join(', ')})가 데이터의 카테고리 순서(${cats.join(', ')})와 다름`);
console.log(`문제 ${q.length}개, 필드 ${KEYS}`);
console.log(`카테고리 섹션: ${sections.join(', ')}`);
console.log('구조 확인 통과');
```

스크립트가 통과하면 `CLAUDE.md`의 "구조"와 "문제 데이터 형식"을 읽어 형식 규칙을 확인하고, `index.html`에서 과학 섹션의 문제 하나를 직접 읽어 들여쓰기(객체 12칸, 필드 16칸)와 따옴표 형식을 봅니다.

**통과 조건**: `구조 확인 통과`가 출력됨.

## 2단계: 문제 개수와 분포 확인

```js
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1] + ';this.q = quizQuestions;', ctx);
const q = ctx.q, errs = [], DIFFS = ['easy', 'medium', 'hard'];
q.forEach((x, i) => {
  const at = `id ${x.id}`;
  if (x.id !== i + 1) errs.push(`${at}: id가 순서(${i + 1})와 다름`);
  if (i > 0 && q.findIndex(y => y.category === x.category) < i && q[i - 1].category !== x.category) errs.push(`${at}: 카테고리 섹션 밖에 있음`);
  if (!DIFFS.includes(x.difficulty)) errs.push(`${at}: 알 수 없는 난이도 ${x.difficulty}`);
  if (!x.question || !x.explanation) errs.push(`${at}: 문제 또는 해설이 비어 있음`);
  if (!Array.isArray(x.options) || x.options.length !== 4 || new Set(x.options.map(o => o.trim())).size !== 4) errs.push(`${at}: 선택지가 서로 다른 4개가 아님`);
  if (!Number.isInteger(x.correctAnswer) || x.correctAnswer < 0 || x.correctAnswer > 3) errs.push(`${at}: correctAnswer 범위 오류`);
});
q.filter((x, i) => q.findIndex(y => y.question.trim() === x.question.trim()) !== i).forEach(x => errs.push(`id ${x.id}: 같은 문제 문장이 이미 있음`));
if (!html.includes(`${q.length}개 문제에서 무작위 출제`)) errs.push('부제의 문제 수가 데이터와 다름');
if (!html.includes(`<span id="totalQuestions">${q.length}</span>`)) errs.push('#totalQuestions 기본값이 데이터와 다름');
const cats = [...new Set(q.map(x => x.category))];
cats.forEach(c => {
  const n = q.filter(x => x.category === c).length, m = html.match(new RegExp(`// ${c} \\((\\d+)문제\\)`));
  if (!m || +m[1] !== n) errs.push(`섹션 주석 "// ${c} (${m ? m[1] : '?'}문제)"가 실제 ${n}문제와 다름`);
});
console.log(`전체 ${q.length}문제`);
console.log('카테고리 | 합계 | easy | medium | hard | 정답 위치 1/2/3/4');
cats.forEach(c => {
  const l = q.filter(x => x.category === c), n = d => l.filter(x => x.difficulty === d).length;
  console.log(`${c} | ${l.length} | ${n('easy')} | ${n('medium')} | ${n('hard')} | ${[0, 1, 2, 3].map(k => l.filter(x => x.correctAnswer === k).length).join(' / ')}`);
});
console.log(errs.length ? errs.map(e => '실패: ' + e).join('\n') : '기존 데이터 형식 오류 없음');
if (errs.length) process.exit(1);
```

기존 데이터에 오류가 있으면 새 문제를 넣지 않고 멈춥니다 (`/check-questions`로 먼저 고치도록 안내).

**통과 조건**: `기존 데이터 형식 오류 없음`이 출력됨. 출력한 분포표는 7단계 보고에 "추가 전" 값으로 씁니다.

## 3단계: 카테고리별 부족한 부분 파악

`N`에 입력한 문제 수를 넣습니다.

```js
const fs = require('fs'), vm = require('vm');
const N = 1;  // 추가할 문제 수
const html = fs.readFileSync('index.html', 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1] + ';this.q = quizQuestions;', ctx);
const q = ctx.q, DIFFS = ['easy', 'medium', 'hard'], RATIO = { easy: 7, medium: 9, hard: 4 };
if (!Number.isInteger(N) || N < 1 || N > 5) { console.log('실패: N은 1~5의 정수여야 함'); process.exit(1); }
const cats = [...new Set(q.map(x => x.category))];
const cnt = {}, pos = {};
cats.forEach(c => {
  cnt[c] = {}; DIFFS.forEach(d => cnt[c][d] = q.filter(x => x.category === c && x.difficulty === d).length);
  pos[c] = [0, 1, 2, 3].map(k => q.filter(x => x.category === c && x.correctAnswer === k).length);
});
const total = c => DIFFS.reduce((s, d) => s + cnt[c][d], 0);
const gapsOf = () => cats.flatMap(c => DIFFS.map(d => ({ c, d, g: Math.max(...cats.map(k => cnt[k][d])) - cnt[c][d] }))).filter(x => x.g > 0);
console.log('[부족한 부분]');
const gaps = gapsOf();
cats.forEach(c => {
  const notes = gaps.filter(x => x.c === c).map(x => `${x.d} ${x.g}문제 부족 (다른 카테고리 최대 ${cnt[c][x.d] + x.g})`);
  const em = cnt[c].easy + cnt[c].medium, mh = cnt[c].medium + cnt[c].hard;
  if (em < 10) notes.push(`easy+medium ${em}문제 (쉬움 난이도에 10문제 이상 필요)`);
  if (mh < 10) notes.push(`medium+hard ${mh}문제 (어려움 난이도에 10문제 이상 필요)`);
  const p = pos[c], spread = Math.max(...p) - Math.min(...p);
  if (spread > 1) notes.push(`정답 위치 치우침 ${p.join(' / ')}`);
  console.log(`  ${c} (${total(c)}문제): ${notes.length ? notes.join(', ') : '부족 없음'}`);
});
const plan = [];
for (let i = 0; i < N; i++) {
  let slot, why;
  const need = cats.find(c => cnt[c].easy + cnt[c].medium < 10 || cnt[c].medium + cnt[c].hard < 10);
  const g = gapsOf().sort((a, b) => b.g - a.g || total(a.c) - total(b.c) || cats.indexOf(a.c) - cats.indexOf(b.c) || DIFFS.indexOf(b.d) - DIFFS.indexOf(a.d));
  if (need) { slot = { c: need, d: 'medium' }; why = '난이도 선택 최소 문제 수 미달'; }
  else if (g.length) { slot = g[0]; why = `다른 카테고리보다 ${slot.d} ${slot.g}문제 적음`; }
  else {
    const c = [...cats].sort((a, b) => total(a) - total(b) || cats.indexOf(a) - cats.indexOf(b))[0];
    const d = [...DIFFS].sort((a, b) => cnt[c][a] / RATIO[a] - cnt[c][b] / RATIO[b])[0];
    slot = { c, d }; why = `모든 카테고리가 균형이라 문제 수가 가장 적은 카테고리에서 비율(7:9:4) 대비 가장 적은 난이도`;
  }
  const p = pos[slot.c], a = p.indexOf(Math.min(...p));
  plan.push({ category: slot.c, difficulty: slot.d, correctAnswer: a });
  console.log(`추가 ${i + 1}: ${slot.c} ${slot.d}, 정답 위치 ${a + 1}번 (correctAnswer: ${a}) ← ${why}`);
  cnt[slot.c][slot.d]++; p[a]++;
}
console.log('PLAN = ' + JSON.stringify(plan));
```

**통과 조건**: `N`개의 "추가 i" 줄과 `PLAN = [...]` 줄이 출력됨. `PLAN`을 4·5단계에 그대로 씁니다.

## 4단계: 새 문제 작성과 중복 체크

`PLAN`의 칸마다 문제를 하나씩 씁니다. 작성 규칙은 `.claude/commands/quiz-add.md` 2단계와 같습니다.

* 카테고리, 난이도, `correctAnswer`는 `PLAN` 값을 그대로 씀
* 선택지는 서로 다른 4개, 오답도 같은 종류로 그럴듯하게
* 해설은 한두 문장에 근거(연도, 수치 등)를 담음
* 난이도 기준: easy는 대부분이 아는 상식, medium은 배웠으면 알거나 헷갈리기 쉬운 것, hard는 전문적이거나 세부적인 지식
* CLAUDE.md "퀴즈 문제 교차 검증 가이드라인" 1~4번을 모두 지킴. 정답과 해설의 사실은 웹 검색으로 **2개 이상의 출처**에서 확인

다 쓰면 `NEW`에 넣어 아래 중복 체크를 실행합니다. `NEW`의 각 항목은 `id` 없이 `{ category, difficulty, question, options, correctAnswer, explanation }` 순서로 씁니다.

```js
const fs = require('fs'), vm = require('vm');
const PLAN = [];  // 3단계 출력
const NEW = [];   // 작성한 문제
const html = fs.readFileSync('index.html', 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1] + ';this.q = quizQuestions;', ctx);
const q = ctx.q, fails = [], warns = [];
const norm = s => s.replace(/[\s.,?!·'"()\[\]~:-]/g, '').toLowerCase();
const grams = s => { const t = norm(s), g = new Set(); for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2)); return g; };
const sim = (a, b) => { const A = grams(a), B = grams(b); let n = 0; A.forEach(x => B.has(x) && n++); return n / (A.size + B.size - n || 1); };
if (NEW.length !== PLAN.length) fails.push(`NEW ${NEW.length}개가 PLAN ${PLAN.length}개와 다름`);
const KEYS = 'category,difficulty,question,options,correctAnswer,explanation';
NEW.forEach((x, i) => {
  const at = `새 문제 ${i + 1}`, p = PLAN[i] || {};
  if (Object.keys(x).join() !== KEYS) fails.push(`${at}: 필드가 ${KEYS} 순서가 아님`);
  if (x.category !== p.category || x.difficulty !== p.difficulty || x.correctAnswer !== p.correctAnswer) fails.push(`${at}: PLAN(${p.category} ${p.difficulty} ${p.correctAnswer})과 다름`);
  if (!x.question || !x.explanation) fails.push(`${at}: 문제 또는 해설이 비어 있음`);
  if (!Array.isArray(x.options) || x.options.length !== 4 || new Set(x.options.map(o => norm(o))).size !== 4) fails.push(`${at}: 선택지가 서로 다른 4개가 아님`);
  if (!Number.isInteger(x.correctAnswer) || x.correctAnswer < 0 || x.correctAnswer > 3) { fails.push(`${at}: correctAnswer 범위 오류`); return; }
  const others = [...q.map(y => ({ label: `id ${y.id}`, y })), ...NEW.slice(0, i).map((y, j) => ({ label: `새 문제 ${j + 1}`, y }))];
  const ans = norm(x.options[x.correctAnswer]);
  others.forEach(({ label, y }) => {
    const s = sim(x.question, y.question);
    if (norm(x.question) === norm(y.question)) fails.push(`${at}: ${label}와 문제 문장이 같음`);
    else if (s >= 0.5) fails.push(`${at}: ${label}와 문제 문장 유사도 ${s.toFixed(2)} (0.5 이상) - "${y.question}"`);
    else if (s >= 0.3) warns.push(`${at}: ${label}와 문제 문장 유사도 ${s.toFixed(2)} - "${y.question}"`);
    if (norm(y.options[y.correctAnswer]) === ans) warns.push(`${at}: ${label}와 정답이 같음 (${y.options[y.correctAnswer]}) - "${y.question}"`);
  });
});
warns.forEach(w => console.log('확인 필요: ' + w));
fails.forEach(f => console.log('실패: ' + f));
console.log(fails.length ? `중복 체크 실패 ${fails.length}건` : `중복 체크 통과 (확인 필요 ${warns.length}건)`);
if (fails.length) process.exit(1);
```

`확인 필요` 항목은 하나씩 직접 판단합니다. 표현만 다르고 **같은 사실을 묻는 문제**(예: 같은 인물의 같은 업적, 같은 수치)이면 실패로 보고 멈춥니다. 정답만 같고 묻는 사실이 다르면 통과이고, 판단 근거를 7단계 보고에 적습니다.

**통과 조건**: `중복 체크 통과`가 출력되고, `확인 필요` 항목이 모두 다른 사실로 판단되고, 새 문제마다 가이드라인 1~4번을 지키며 출처 2개 이상으로 확인됨. 출처로 확인되지 않는 사실이 하나라도 있으면 실패입니다.

## 5단계: 문제 추가와 형식 검증

### 5-1. 추가

4단계의 `NEW`를 그대로 넣고 실행합니다. 수정 전 `index.html`을 임시 폴더에 복사해 둔 뒤, 카테고리 섹션 끝에 문제를 넣고 뒤따르는 id를 1씩 밀고, 섹션 주석, 부제, `#totalQuestions`의 문제 수를 고칩니다.

```js
const fs = require('fs'), os = require('os'), path = require('path');
const NEW = [];  // 4단계의 NEW
const BEFORE = path.join(os.tmpdir(), 'quiz-daily-before.html');
const fail = m => { console.log('실패: ' + m); process.exit(1); };
let html = fs.readFileSync('index.html', 'utf8');
fs.writeFileSync(BEFORE, html);
const esc = s => JSON.stringify(s);
const ids = [];
NEW.forEach(x => {
  const start = html.indexOf('const quizQuestions = ['), end = html.indexOf('\n        ];', start);
  if (start < 0 || end < 0) fail('quizQuestions 위치를 찾지 못함');
  let block = html.slice(start, end);
  const inCat = [...block.matchAll(/\n {16}id: (\d+),\n {16}category: "([^"]+)",/g)].filter(m => m[2] === x.category).map(m => +m[1]);
  if (!inCat.length) fail(`카테고리 "${x.category}"의 문제를 찾지 못함`);
  const LAST = Math.max(...inCat);
  block = block.replace(/(\n {16}id: )(\d+),/g, (m, p, n) => +n > LAST ? p + (+n + 1) + ',' : m);
  const at = block.indexOf(`\n                id: ${LAST},`);
  let close = block.indexOf('\n            }', at);
  if (at < 0 || close < 0) fail(`id ${LAST} 문제 객체의 끝을 찾지 못함`);
  close += '\n            }'.length;
  const obj = ['{', `    id: ${LAST + 1},`, `    category: ${esc(x.category)},`, `    difficulty: ${esc(x.difficulty)},`, `    question: ${esc(x.question)},`,
    `    options: [${x.options.map(esc).join(', ')}],`, `    correctAnswer: ${x.correctAnswer},`, `    explanation: ${esc(x.explanation)}`, '}'].map(l => '            ' + l).join('\n');
  block = block[close] === ','
    ? block.slice(0, close + 1) + '\n' + obj + ',' + block.slice(close + 1)
    : block.slice(0, close) + ',\n' + obj + block.slice(close);
  block = block.replace(new RegExp(`// ${x.category} \\((\\d+)문제\\)`), (m, n) => `// ${x.category} (${+n + 1}문제)`);
  html = html.slice(0, start) + block + html.slice(end);
  ids.forEach((id, k) => { if (id > LAST) ids[k] = id + 1; });
  ids.push(LAST + 1);
});
const total = (html.slice(html.indexOf('const quizQuestions = ['), html.indexOf('\n        ];')).match(/\n {16}id: \d+,/g) || []).length;
html = html.replace(/\d+개 문제에서 무작위 출제/, `${total}개 문제에서 무작위 출제`).replace(/<span id="totalQuestions">\d+<\/span>/, `<span id="totalQuestions">${total}</span>`);
fs.writeFileSync('index.html', html);
console.log(`추가한 id: ${ids.join(', ')} / 전체 ${total}문제 / 수정 전 사본: ${BEFORE}`);
```

그다음 문제 수가 적힌 문서를 새 값으로 직접 고칩니다.

* `Study-03-basic/CLAUDE.md`: "현재 N문제, …" 줄 (카테고리별 문제 수와 난이도 구성을 실제 값으로), 부제 예시 `("N개 문제에서 무작위 출제")`
* 저장소 루트 `README.md`: 비교표의 `Study-03-basic` 문제 수, 부제 예시 `("N개 문제에서 무작위 출제")`
* 저장소 루트 `CLAUDE.md`는 루트 버전 설명이므로 고치지 않음

### 5-2. 형식 검증

`NEW`는 5-1과 같은 값을 넣습니다.

```js
const fs = require('fs'), vm = require('vm'), os = require('os'), path = require('path');
const NEW = [];  // 4단계의 NEW
const BEFORE = path.join(os.tmpdir(), 'quiz-daily-before.html');
const load = h => { const c = {}; vm.createContext(c); vm.runInContext(h.match(/<script>([\s\S]*?)<\/script>/)[1] + ';this.q = quizQuestions;', c); return c.q; };
const html = fs.readFileSync('index.html', 'utf8');
const errs = [], DIFFS = ['easy', 'medium', 'hard'];
let q, old;
try { q = load(html); old = load(fs.readFileSync(BEFORE, 'utf8')); } catch (e) { console.log('실패: 문제 데이터 실행 오류 ' + e.message); process.exit(1); }
q.forEach((x, i) => {
  const at = `id ${x.id}`;
  if (x.id !== i + 1) errs.push(`${at}: id가 순서(${i + 1})와 다름`);
  if (i > 0 && q.findIndex(y => y.category === x.category) < i && q[i - 1].category !== x.category) errs.push(`${at}: 카테고리 섹션 밖에 있음`);
  if (!DIFFS.includes(x.difficulty)) errs.push(`${at}: 알 수 없는 난이도 ${x.difficulty}`);
  if (!x.question || !x.explanation) errs.push(`${at}: 문제 또는 해설이 비어 있음`);
  if (!Array.isArray(x.options) || x.options.length !== 4 || new Set(x.options.map(o => o.trim())).size !== 4) errs.push(`${at}: 선택지가 서로 다른 4개가 아님`);
  if (!Number.isInteger(x.correctAnswer) || x.correctAnswer < 0 || x.correctAnswer > 3) errs.push(`${at}: correctAnswer 범위 오류`);
});
q.filter((x, i) => q.findIndex(y => y.question.trim() === x.question.trim()) !== i).forEach(x => errs.push(`id ${x.id}: 같은 문제 문장이 이미 있음`));
if (q.length !== old.length + NEW.length) errs.push(`문제 수 ${q.length}가 추가 전 ${old.length} + ${NEW.length}와 다름`);
const strip = ({ id, ...rest }) => JSON.stringify(rest);
const rest = q.map(strip), added = NEW.map(x => JSON.stringify(x));
added.forEach((s, i) => { if (!rest.includes(s)) errs.push(`새 문제 ${i + 1}이 데이터에 없거나 내용이 다름`); });
const kept = rest.filter(s => !added.includes(s));
if (kept.join('\n') !== old.map(strip).join('\n')) errs.push('기존 문제의 내용이나 순서가 바뀜');
if (!html.includes(`${q.length}개 문제에서 무작위 출제`)) errs.push('부제의 문제 수가 데이터와 다름');
if (!html.includes(`<span id="totalQuestions">${q.length}</span>`)) errs.push('#totalQuestions 기본값이 데이터와 다름');
[...new Set(q.map(x => x.category))].forEach(c => {
  const n = q.filter(x => x.category === c).length, m = html.match(new RegExp(`// ${c} \\((\\d+)문제\\)`));
  if (!m || +m[1] !== n) errs.push(`섹션 주석 "// ${c}"의 문제 수가 실제 ${n}문제와 다름`);
});
if (!fs.readFileSync('CLAUDE.md', 'utf8').includes(`현재 ${q.length}문제`)) errs.push(`Study-03-basic/CLAUDE.md에 "현재 ${q.length}문제"가 없음`);
const readme = fs.readFileSync('../README.md', 'utf8');
if (!readme.includes(`| ${q.length}문제 (`)) errs.push(`README.md 비교표에 "${q.length}문제"가 없음`);
if (!readme.includes(`${q.length}개 문제에서 무작위 출제`)) errs.push(`README.md 부제 예시가 ${q.length}개가 아님`);
console.log(errs.length ? errs.map(e => '실패: ' + e).join('\n') : '형식 검증 통과');
console.log(`전체 ${q.length}문제 (추가 전 ${old.length})`);
[...new Set(q.map(x => x.category))].forEach(c => {
  const l = q.filter(x => x.category === c), n = d => l.filter(x => x.difficulty === d).length;
  console.log(`  ${c}: ${l.length}문제 (easy ${n('easy')} / medium ${n('medium')} / hard ${n('hard')}), 정답 위치 ${[0, 1, 2, 3].map(k => l.filter(x => x.correctAnswer === k).length).join(' / ')}`);
});
if (errs.length) process.exit(1);
```

**통과 조건**: `형식 검증 통과`가 출력됨.

### 복원 (5단계나 6단계가 실패했을 때만)

1. 임시 폴더의 `quiz-daily-before.html`(`path.join(os.tmpdir(), 'quiz-daily-before.html')`)을 `index.html`에 덮어씁니다.
2. 5-1에서 고친 `CLAUDE.md`와 `README.md`의 문제 수를 원래 값으로 되돌립니다.
3. 2단계 스크립트를 다시 실행해 `기존 데이터 형식 오류 없음`과 추가 전 문제 수가 나오는지 확인합니다. 안 나오면 "복원 실패"로 보고합니다.

## 6단계: 전체 데이터 백업

추가를 마친 전체 데이터를 `Study-03-basic/backups/quiz-날짜-시각/`에 저장하고 저장한 내용을 다시 읽어 검증합니다. `questions.json`은 문제 데이터만, `index.html`은 파일 전체 사본입니다. `backups/`는 저장소 루트 `.gitignore`에 들어 있어야 합니다 (없으면 `# quiz-daily 백업` 주석과 함께 `Study-03-basic/backups/`를 추가).

```js
const fs = require('fs'), vm = require('vm'), os = require('os'), path = require('path');
const fail = m => { console.log('실패: ' + m); process.exit(1); };
const d = new Date(), p = n => String(n).padStart(2, '0');
const dir = path.join('backups', `quiz-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`);
if (fs.existsSync(dir)) fail(`백업 폴더 ${dir}가 이미 있음`);
const html = fs.readFileSync('index.html', 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1] + ';this.q = quizQuestions;', ctx);
const json = JSON.stringify(ctx.q, null, 2) + '\n';
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'questions.json'), json);
fs.copyFileSync('index.html', path.join(dir, 'index.html'));
let back;
try { back = JSON.parse(fs.readFileSync(path.join(dir, 'questions.json'), 'utf8')); } catch (e) { fail('백업한 questions.json을 읽지 못함: ' + e.message); }
if (JSON.stringify(back) !== JSON.stringify(ctx.q)) fail('백업한 questions.json이 현재 데이터와 다름');
if (!fs.readFileSync(path.join(dir, 'index.html')).equals(fs.readFileSync('index.html'))) fail('백업한 index.html이 원본과 다름');
if (!fs.readFileSync('../.gitignore', 'utf8').split(/\r?\n/).some(l => /^\/?(Study-03-basic\/)?backups\/?$/.test(l.trim()))) fail('.gitignore에 backups/가 없음');
const before = path.join(os.tmpdir(), 'quiz-daily-before.html');
if (fs.existsSync(before)) fs.unlinkSync(before);
const kb = f => (fs.statSync(path.join(dir, f)).size / 1024).toFixed(1) + 'KB';
console.log(`백업 검증 통과: ${dir} (questions.json ${back.length}문제 ${kb('questions.json')}, index.html ${kb('index.html')})`);
```

**통과 조건**: `백업 검증 통과`가 출력됨. 실패하면 백업 폴더에 남은 파일을 지우고, 복원 절차를 거쳐 멈춥니다.

## 7단계: 결과 보고

맨 위에 `✅ quiz-daily 완료: N문제 추가 (전체 A → B문제), 백업 경로` 한 줄 요약을 적고 아래 순서로 보여 줍니다.

1. **단계별 결과**: 1~6단계마다 통과 여부와 핵심 수치를 한 줄씩 적은 표
2. **파일 구조**: 1단계에서 확인한 `<script>` 4개의 역할과 줄 수, 문제 데이터 필드
3. **분포 변화**: 카테고리별 합계, easy/medium/hard, 정답 위치를 추가 전(2단계)과 추가 후(5-2단계)로 나란히 비교한 표. 바뀐 칸은 굵게
4. **부족한 부분과 선택 이유**: 3단계 분석 결과와 각 문제를 그 칸에 넣은 이유
5. **추가한 문제**: 문제마다 id, 카테고리, 난이도, 문제, 선택지(정답 표시), 해설
6. **중복 체크**: 유사도나 정답이 겹친 `확인 필요` 항목과 판단 근거 (없으면 "없음")
7. **가이드라인 확인**: 문제마다 1~4번 항목을 어떻게 지켰는지 한 줄씩. 4번에는 확인한 출처 2개 이상을 링크로 적음
8. **바뀐 곳**: id가 밀린 범위, 고친 파일과 위치, 백업 폴더와 파일 크기
9. **남은 불균형**: 추가 후에도 카테고리별 문제 수나 난이도 구성이 다른 곳 (다음 실행 때 채울 칸)

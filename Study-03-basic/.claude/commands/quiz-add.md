---
description: 카테고리와 난이도를 받아 검증 가이드라인을 지킨 새 퀴즈 문제를 추가
argument-hint: "[카테고리] [난이도] (예: 과학 medium, 예술과 문화 hard)"
---
<!-- Created: 2026-09-28 16:33 -->

`index.html` 첫 번째 `<script>`의 `quizQuestions`에 새 문제를 하나 추가합니다.

입력: $ARGUMENTS

* 마지막 단어가 난이도(`easy` | `medium` | `hard`), 그 앞 전부가 카테고리입니다. `예술과 문화`처럼 띄어쓰기가 있는 카테고리도 그대로 씁니다.
* 파일은 수정하지만 커밋은 하지 않습니다.

## 1단계: 입력 확인과 현황 (자동)

아래 스크립트를 `Study-03-basic` 폴더에서 Node로 실행합니다. `CATEGORY`와 `DIFFICULTY`에는 위 입력을 나눠서 넣습니다. 입력이 비어 있으면 둘 다 `''`로 둡니다.

```js
const fs = require('fs'), vm = require('vm');
const CATEGORY = '', DIFFICULTY = '';  // 입력에서 나눈 카테고리, 난이도
const html = fs.readFileSync('index.html', 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1] + ';this.q = quizQuestions;', ctx);
const q = ctx.q, CATS = [...new Set(q.map(x => x.category))], DIFFS = ['easy', 'medium', 'hard'];
if (!CATS.includes(CATEGORY) || !DIFFS.includes(DIFFICULTY)) {
  console.log(`입력이 올바르지 않음: 카테고리 "${CATEGORY}", 난이도 "${DIFFICULTY}"`);
  console.log(`사용법: /quiz-add 카테고리 난이도\n카테고리: ${CATS.join(', ')}\n난이도: ${DIFFS.join(', ')}`);
  process.exit(1);
}
const list = q.filter(x => x.category === CATEGORY);
console.log(`[${CATEGORY}] 기존 ${list.length}문제`);
list.forEach(x => console.log(`  ${x.id} | ${x.difficulty} | ${x.question} → ${x.options[x.correctAnswer]}`));
const n = d => list.filter(x => x.difficulty === d).length;
console.log(`난이도: easy ${n('easy')} / medium ${n('medium')} / hard ${n('hard')}`);
const pos = [0, 1, 2, 3].map(k => list.filter(x => x.correctAnswer === k).length);
console.log(`정답 위치 (1~4번): ${pos.join(' / ')} → 가장 적은 위치: ${pos.indexOf(Math.min(...pos)) + 1}번`);
const last = Math.max(...list.map(x => x.id));
console.log(`카테고리 마지막 id: ${last} → 새 문제 id: ${last + 1}, 뒤따르는 ${q.filter(x => x.id > last).length}문제는 id가 1씩 밀림`);
```

입력이 올바르지 않다는 메시지가 나오면 사용법을 보여 주고 멈춥니다.

## 2단계: 문제 작성

파일을 고치기 전에 문제를 먼저 완성하고 검증합니다.

**형식** (기존 문제와 같은 필드와 순서, 들여쓰기)

```js
            {
                id: 새 id,
                category: "카테고리",
                difficulty: "난이도",
                question: "문제?",
                options: ["선택지1", "선택지2", "선택지3", "선택지4"],
                correctAnswer: 0,
                explanation: "해설."
            },
```

* `options`는 서로 다른 문자열 정확히 4개. 오답도 같은 종류(인물이면 인물, 연도면 연도)로 그럴듯하게
* `correctAnswer`는 0부터 시작하는 인덱스. 정답은 1단계에서 나온 **가장 적은 정답 위치**에 둠
* `explanation`은 한두 문장. 정답의 근거(연도, 수치 등)를 담고, 기준을 바꾸면 답이 달라지는 경우 그 답도 적음 (예: 19번 담수호, 16번 극지 사막)
* 1단계 목록과 주제가 겹치지 않게 함 (같은 사실을 다르게 묻는 문제도 피함)

**난이도**: 요청한 난이도에 맞는 내용을 고릅니다.

* easy: 대부분이 아는 상식 (예: 수도, 유명 작품의 작가)
* medium: 배웠으면 아는 내용이나 헷갈리기 쉬운 것 (예: 연도, 함정이 있는 최상급)
* hard: 전문적이거나 세부적인 지식

**검증 가이드라인** (CLAUDE.md "퀴즈 문제 교차 검증 가이드라인", 모두 통과해야 추가)

1. **정답이 하나뿐인가?** 오답 선택지 중 해석에 따라 맞을 수 있는 것이 없는지 하나씩 확인. 여지가 있으면 조건을 명시 (예: 면적 기준, 2024년 기준)
2. **최상급 표현에 기준이 있는가?** '가장', '최초', '최대' 등을 쓰면 측정 기준(면적, 인구, 높이, 무게 등)과 순서 기준(시간순, 공식 인정 등)을 문장에 넣음
3. **시간과 범위가 명확한가?** 변할 수 있는 정보는 시점을, 지리적·분류적 범위는 한정어를 넣음
4. **교차 검증했는가?** 정답과 해설의 사실(수치, 연도, 이름)을 웹 검색으로 **2개 이상의 출처**에서 확인. 출처끼리 다르거나 논란이 있으면 주류 학설을 따르고 해설에 다른 설을 짧게 적음. 확인이 안 되는 사실은 쓰지 않고 다른 문제로 바꿈

## 3단계: 추가

1. id 밀기: 아래 스크립트에서 `LAST`에 1단계의 카테고리 마지막 id를 넣고 실행합니다. `quizQuestions` 안에서 `LAST`보다 큰 id를 1씩 올립니다.

   ```js
   const fs = require('fs');
   const LAST = NaN;  // 카테고리 마지막 id
   const html = fs.readFileSync('index.html', 'utf8');
   const start = html.indexOf('const quizQuestions = [');
   const end = html.indexOf('\n        ];', start);
   if (!Number.isInteger(LAST) || start < 0 || end < 0) { console.log('LAST 또는 quizQuestions 위치를 찾지 못함'); process.exit(1); }
   let moved = 0;
   const block = html.slice(start, end).replace(/(\bid: )(\d+),/g, (m, p, n) => +n > LAST ? (moved++, p + (+n + 1) + ',') : m);
   fs.writeFileSync('index.html', html.slice(0, start) + block + html.slice(end));
   console.log(`id ${LAST + 1} 이후 ${moved}문제의 id를 1씩 올림`);
   ```

2. 새 문제 넣기: id가 `LAST`인 문제 객체 바로 뒤에 2단계의 문제를 넣습니다 (그 카테고리 섹션의 끝).
3. 섹션 주석 고치기: 해당 카테고리의 `// 카테고리 (N문제)` 주석의 문제 수를 1 올립니다.
4. 문제 수와 연결된 곳 고치기: 전체 문제 수를 새 값으로 바꿉니다.
   * `index.html` 부제 `"N개 문제에서 무작위 출제"`와 `#totalQuestions` 기본값
   * `Study-03-basic/CLAUDE.md`의 "현재 N문제, 카테고리마다 …" 줄 (카테고리별 문제 수와 난이도 비율이 달라지면 실제 값으로 적음)
   * 저장소 루트 `README.md` 비교표의 `Study-03-basic` 문제 수
   * 저장소 루트 `CLAUDE.md`는 루트 버전 설명이므로 고치지 않음

## 4단계: 확인 (자동)

아래 스크립트를 실행해 형식을 확인합니다. 오류가 나오면 고친 뒤 다시 실행합니다.

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
console.log(errs.length ? errs.join('\n') : '형식 오류 없음');
console.log(`전체 ${q.length}문제`);
[...new Set(q.map(x => x.category))].forEach(c => {
  const l = q.filter(x => x.category === c), n = d => l.filter(x => x.difficulty === d).length;
  console.log(`  ${c}: ${l.length}문제 (easy ${n('easy')} / medium ${n('medium')} / hard ${n('hard')}), 정답 위치 ${[0, 1, 2, 3].map(k => l.filter(x => x.correctAnswer === k).length).join(' / ')}`);
});
```

## 보고 형식

맨 위에 한 줄 요약(추가한 id, 카테고리, 난이도)을 적고 아래 순서로 보여 줍니다.

1. 추가한 문제: 문제, 선택지(정답 표시), 해설
2. 가이드라인 확인: 1~4번 항목마다 어떻게 지켰는지 한 줄씩. 4번에는 확인한 출처 2개 이상을 적음
3. 바뀐 곳: id가 밀린 범위, 고친 파일과 위치
4. 4단계 출력. 카테고리별 문제 수나 난이도 비율이 다른 카테고리(11문제, easy 4 : medium 5 : hard 2)와 달라졌으면 알려 줌

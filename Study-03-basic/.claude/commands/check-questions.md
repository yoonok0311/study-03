---
description: 퀴즈 문제 데이터를 형식 규칙과 교차 검증 가이드라인으로 검증
argument-hint: "[문제 id(예: 5 12-15) | 카테고리 | 비우면 전체]"
---
<!-- Created: 2026-09-28 15:13 -->

`index.html` 첫 번째 `<script>`의 `quizQuestions`를 검증합니다. 대상: $ARGUMENTS (비어 있으면 전체 문제)

검증만 하고 파일은 수정하지 않습니다. 고칠 내용은 보고서에 제안으로 적고, 사용자가 요청하면 그때 고칩니다.

## 1단계: 형식 검사 (자동)

아래 스크립트를 `Study-03-basic` 폴더에서 Node로 실행합니다. 대상과 관계없이 전체 데이터를 검사합니다.

```js
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1] + ';this.q = quizQuestions;', ctx);
const q = ctx.q, errs = [];
const CATS = ['한국사', '세계지리', '과학', '예술과 문화'], DIFFS = ['easy', 'medium', 'hard'];
q.forEach((x, i) => {
  const at = `id ${x.id}`;
  if (x.id !== i + 1) errs.push(`${at}: id가 순서(${i + 1})와 다름`);
  if (!CATS.includes(x.category)) errs.push(`${at}: 알 수 없는 카테고리 ${x.category}`);
  if (!DIFFS.includes(x.difficulty)) errs.push(`${at}: 알 수 없는 난이도 ${x.difficulty}`);
  if (!x.question || !x.explanation) errs.push(`${at}: 문제 또는 해설이 비어 있음`);
  if (!Array.isArray(x.options) || x.options.length !== 4) errs.push(`${at}: 선택지가 4개가 아님`);
  else if (new Set(x.options.map(o => o.trim())).size !== 4) errs.push(`${at}: 중복 선택지`);
  if (!Number.isInteger(x.correctAnswer) || x.correctAnswer < 0 || x.correctAnswer > 3) errs.push(`${at}: correctAnswer 범위 오류`);
});
const dupQ = q.filter((x, i) => q.findIndex(y => y.question.trim() === x.question.trim()) !== i);
dupQ.forEach(x => errs.push(`id ${x.id}: 같은 문제 문장이 이미 있음`));
q.forEach((x, i) => {
  if (i > 0 && q[i - 1].category !== x.category && q.findIndex(y => y.category === x.category) < i) errs.push(`id ${x.id}: ${x.category} 섹션 밖에 있음`);
});
CATS.forEach(c => {
  const count = q.filter(x => x.category === c).length;
  if (count < 10) errs.push(`${c}: ${count}문제 (전체 도전과 카테고리 도전에 10문제 이상 필요)`);
  if (!html.includes(`// ${c} (${count}문제)`)) errs.push(`${c}: 섹션 주석의 문제 수가 실제(${count})와 다름`);
  // 문제 난이도 선택: 쉬움은 easy+medium, 어려움은 medium+hard에서 카테고리마다 10문제를 뽑음
  const n = d => q.filter(x => x.category === c && d.includes(x.difficulty)).length;
  if (n(['easy', 'medium']) < 10) errs.push(`${c}: easy+medium ${n(['easy', 'medium'])}문제 (난이도 '쉬움'에 10문제 이상 필요)`);
  if (n(['medium', 'hard']) < 10) errs.push(`${c}: medium+hard ${n(['medium', 'hard'])}문제 (난이도 '어려움'에 10문제 이상 필요)`);
});
if (q.length < 20) errs.push(`문제 수 ${q.length} (스피드 퀴즈에 20문제 이상 필요)`);
if (!html.includes(`${q.length}개 문제에서 무작위 출제`)) errs.push('부제의 문제 수가 데이터와 다름');
if (!html.includes(`<span id="totalQuestions">${q.length}</span>`)) errs.push('#totalQuestions 기본값이 데이터와 다름');
if (!fs.readFileSync('CLAUDE.md', 'utf8').includes(`현재 ${q.length}문제`)) errs.push('CLAUDE.md의 "현재 N문제"가 데이터와 다름');
console.log(errs.length ? errs.join('\n') : '형식 오류 없음');
console.log(`\n전체 ${q.length}문제, 정답 위치 분포 (1~4번): ${[0, 1, 2, 3].map(k => q.filter(x => x.correctAnswer === k).length).join(' / ')}`);
CATS.forEach(c => {
  const l = q.filter(x => x.category === c), n = d => l.filter(x => x.difficulty === d).length;
  console.log(`  ${c}: ${l.length}문제, easy ${n('easy')} / medium ${n('medium')} / hard ${n('hard')}`);
});
```

문제 수와 난이도 비율은 고정값으로 검사하지 않고 실제 값을 보여 줍니다. 아래에 해당하면 보고서에 참고로 적습니다.

* 정답 위치가 한 번호에 크게 몰려 있음
* 카테고리마다 문제 수나 난이도 비율(기본 easy 7 : medium 9 : hard 4, 약 35% : 45% : 20%)이 크게 다름

## 2단계: 내용 검증 (대상 문제마다)

CLAUDE.md의 "퀴즈 문제 교차 검증 가이드라인"을 기준으로 봅니다.

1. **정답이 하나뿐인가?** 오답 선택지 중 해석에 따라 맞을 수 있는 것이 없는지 확인
2. **최상급 표현에 기준이 있는가?** '가장 큰', '최초의' 등에 측정 기준(면적, 인구, 높이 등)이 있는지 확인
3. **시간과 범위가 명확한가?** 변할 수 있는 정보(인구, 기록, 순위 등)에 시점이 있는지, 지리적·분류적 범위가 한정되었는지 확인
4. **사실이 맞는가?** 정답과 해설의 사실관계를 확인. 확신이 없거나 논란이 있는 내용은 웹 검색으로 2개 이상의 출처를 확인하고, 논란이 있으면 주류 학설 기준인지 봄
5. **해설이 정답과 맞는가?** 해설이 정답 선택지를 뒷받침하고, 해설 속 수치와 연도가 문제와 어긋나지 않는지 확인
6. **난이도가 적절한가?** 표시된 `difficulty`가 실제 난이도와 크게 어긋나지 않는지 확인

## 보고 형식

맨 위에 한 줄 요약(검사한 문제 수, 문제 있는 문제 수)을 적고, 이어서:

* **형식 검사 결과**: 1단계 출력
* **수정 필요**: 문제가 있는 항목만 표로. 열은 `id | 카테고리 | 문제(앞부분) | 문제점 | 수정 제안`. 사실 오류는 확인한 출처를 함께 적음
* **참고**: 틀리지는 않았지만 다듬으면 좋은 점 (간단히)

문제가 없는 항목은 나열하지 않습니다.

---
description: 퀴즈 문제에서 '가장', '최초', '최대' 같은 최상급 표현을 찾아 어떤 기준을 명시해야 하는지 알려 줌
argument-hint: "[카테고리 (예: 세계지리), 비우면 전체]"
---
<!-- Created: 2026-09-28 15:14 -->

`index.html` 첫 번째 `<script>`의 `quizQuestions`에서 '가장', '최초', '최대' 같은 모호한 최상급 표현을 찾고, 어떤 기준을 명시해야 하는지 알려 줍니다.

검증할 카테고리: $ARGUMENTS

* 카테고리가 있으면 그 카테고리의 문제만 검증합니다.
* 비어 있으면 전체 문제를 검증합니다.

검색만 하고 파일은 수정하지 않습니다.

## 1단계: 검색 (자동)

아래 스크립트를 `Study-03-basic` 폴더에서 Node로 실행합니다. `CATEGORY`에는 위의 검증할 카테고리를 앞뒤 공백 없이 그대로 넣습니다 (`예술과 문화`처럼 띄어쓰기가 있는 카테고리도 한 값). 비어 있으면 `''`로 둡니다.

```js
const fs = require('fs'), vm = require('vm');
const CATEGORY = '';  // 검증할 카테고리, 비우면 전체
const WORDS = ['가장', '최초', '최대', '최소', '최고', '최저', '최장', '최단', '최다', '최후', '제일', '처음', '첫 ', '첫번째', '첫 번째'];
const html = fs.readFileSync('index.html', 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1] + ';this.q = quizQuestions;', ctx);
const categories = [...new Set(ctx.q.map(x => x.category))];
if (CATEGORY && !categories.includes(CATEGORY)) {
  console.log(`없는 카테고리: ${CATEGORY}\n사용 가능: ${categories.join(', ')}`);
  process.exit(1);
}
const targets = CATEGORY ? ctx.q.filter(x => x.category === CATEGORY) : ctx.q;
const hits = [];
targets.forEach(x => {
  const fields = { 문제: x.question, 정답: x.options[x.correctAnswer], 해설: x.explanation };
  Object.entries(fields).forEach(([where, text]) => {
    const found = WORDS.filter(w => text.includes(w));
    if (found.length) hits.push({ id: x.id, category: x.category, where, words: [...new Set(found.map(w => w.trim()))].join(', '), text, options: x.options.join(' / ') });
  });
});
console.log(JSON.stringify(hits, null, 1));
console.log(`\n범위: ${CATEGORY || '전체'} (${targets.length}문제 검사)`);
console.log(`${new Set(hits.map(h => h.id)).size}개 문제, ${hits.length}곳`);
```

없는 카테고리라는 메시지가 나오면 사용 가능한 카테고리 목록을 보여 주고 멈춥니다.

## 2단계: 기준 확인

**문제 문장**에 최상급 표현이 있는 항목마다 CLAUDE.md의 교차 검증 가이드라인 2번("최상급 표현에 기준이 있는가?")으로 판단합니다. 선택지(`options`)도 함께 보고, 기준이 없을 때 선택지 중 다른 답이 나올 수 있는지 확인합니다.

확인할 기준:

* 측정 기준: 면적, 인구, 높이, 길이, 부피, 무게, 지름 등
* 범위: 세계, 한국, 아시아, 태양계, 인체 등
* 시점: 변할 수 있는 정보면 연도 (예: 2024년 기준)
* 순서 기준: '최초', '첫 번째'는 무엇의 처음인지 (시간순, 공식 인정 등)

판단:

* ✅ 기준 있음: 필요한 기준이 문장에 모두 있음. 어떤 기준이 있는지 적음
* ⚠️ 보완 필요: 기준이 빠져서 다른 답이 나올 수 있음. **어떤 기준을 명시해야 하는지**, 그 기준이 없으면 어떤 다른 답이 가능한지, 고친 문장을 제안
* 판단이 애매하면 ⚠️로 두고 이유를 적음
* 작품 제목(예: '최후의 만찬')처럼 비교가 아닌 표현은 ✅로 두고 검사 대상이 아니라고 적음

해설이나 정답에만 있는 표현은 문제의 정답을 흔들지 않으면 따로 판단하지 않고 목록에만 보여 줍니다.

## 보고 형식

맨 위에 한 줄 요약(검증 범위, 해당 문제 수, 보완 필요 수)을 적고 표 하나로 보여 줍니다.

`id | 카테고리 | 위치(문제/정답/해설) | 표현 | 문장 | 판단 | 명시할 기준 | 수정 제안`

* `명시할 기준`: ⚠️이면 빠진 기준 (예: 면적 기준, 2024년 기준), ✅이면 이미 있는 기준
* id 순서로 정렬하고, 문장이 길면 표현 주변만 잘라서 보여 줍니다.

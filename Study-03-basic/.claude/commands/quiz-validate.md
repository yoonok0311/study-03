---
description: 퀴즈 문제에서 '가장', '최초', '최대' 같은 최상급 표현을 찾아 목록으로 보여 줌
argument-hint: "[추가로 찾을 표현 (예: 유일 대표)]"
---
<!-- Created: 2026-09-28 15:14 -->

`index.html` 첫 번째 `<script>`의 `quizQuestions`에서 최상급 표현을 찾아 목록으로 보여 줍니다. 추가로 찾을 표현: $ARGUMENTS

검색만 하고 파일은 수정하지 않습니다.

## 1단계: 검색 (자동)

아래 스크립트를 `Study-03-basic` 폴더에서 Node로 실행합니다. `$ARGUMENTS`에 표현이 있으면 `EXTRA` 배열에 넣습니다.

```js
const fs = require('fs'), vm = require('vm');
const EXTRA = [];  // $ARGUMENTS의 표현
const WORDS = ['가장', '최초', '최대', '최소', '최고', '최저', '최장', '최단', '최다', '최후', '제일', '처음', '첫 ', '첫번째', '첫 번째', ...EXTRA];
const html = fs.readFileSync('index.html', 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1] + ';this.q = quizQuestions;', ctx);
const hits = [];
ctx.q.forEach(x => {
  const fields = { 문제: x.question, 정답: x.options[x.correctAnswer], 해설: x.explanation };
  Object.entries(fields).forEach(([where, text]) => {
    const found = WORDS.filter(w => text.includes(w));
    if (found.length) hits.push({ id: x.id, category: x.category, where, words: [...new Set(found.map(w => w.trim()))].join(', '), text });
  });
});
console.log(JSON.stringify(hits, null, 1));
console.log(`\n${new Set(hits.map(h => h.id)).size}개 문제, ${hits.length}곳`);
```

## 2단계: 기준 확인

**문제 문장**에 최상급 표현이 있는 항목마다 CLAUDE.md의 교차 검증 가이드라인 2번("최상급 표현에 기준이 있는가?")으로 판단합니다.

* ✅ 기준 있음: 측정 기준(면적, 인구, 높이, 길이 등)이나 범위(세계, 한국, 태양계 등), 필요하면 시점까지 문장에 있음
* ⚠️ 보완 필요: 기준이나 범위가 빠져서 다른 답이 나올 수 있음. 어떤 다른 답이 가능한지와 고친 문장을 제안
* 판단이 애매하면 ⚠️로 두고 이유를 적음

해설이나 정답에만 있는 표현은 문제의 정답을 흔들지 않으면 따로 표시하지 않고 목록에만 보여 줍니다.

## 보고 형식

맨 위에 한 줄 요약(해당 문제 수, 보완 필요 수)을 적고 표 하나로 보여 줍니다.

`id | 카테고리 | 위치(문제/정답/해설) | 표현 | 문장 | 판단 | 수정 제안`

id 순서로 정렬하고, 문장이 길면 표현 주변만 잘라서 보여 줍니다.

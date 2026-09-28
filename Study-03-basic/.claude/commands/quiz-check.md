---
description: 퀴즈 문제마다 정답이 사실에 맞고 하나뿐인지 출처로 교차 검증
argument-hint: "[문제 id(예: 5 12-15) | 카테고리 | 비우면 전체]"
---
<!-- Created: 2026-09-28 17:10 -->

`index.html` 첫 번째 `<script>`의 `quizQuestions`에서 **정답의 정확성**을 검증합니다. 대상: $ARGUMENTS (비어 있으면 전체 문제)

형식 검사와 가이드라인 전반은 `/check-questions`, 최상급 표현은 `/quiz-validate`가 맡습니다. 이 명령어는 "표시된 정답이 정말 맞는가, 다른 보기는 정말 틀렸는가, 해설이 사실인가"만 깊게 봅니다.

검증만 하고 파일은 수정하지 않습니다. 고칠 내용은 보고서에 제안으로 적고, 사용자가 요청하면 그때 고칩니다.

## 1단계: 대상 문제 목록 (자동)

아래 스크립트를 `Study-03-basic` 폴더에서 Node로 실행합니다. `TARGET`에는 위의 대상 문자열을 그대로 넣습니다 (비어 있으면 `''`).

```js
const fs = require('fs'), vm = require('vm');
const TARGET = '';  // 예: '5 12-15', '과학', ''
const html = fs.readFileSync('index.html', 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1] + ';this.q = quizQuestions;', ctx);
const q = ctx.q, cats = [...new Set(q.map(x => x.category))];
let targets = q;
if (TARGET.trim()) {
  if (cats.includes(TARGET.trim())) targets = q.filter(x => x.category === TARGET.trim());
  else {
    const ids = new Set();
    for (const part of TARGET.trim().split(/[\s,]+/)) {
      const m = part.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) { console.log(`대상이 올바르지 않음: "${part}"\n사용법: /quiz-check [id | id-id | 카테고리(${cats.join(', ')})]`); process.exit(1); }
      for (let i = +m[1]; i <= +(m[2] || m[1]); i++) ids.add(i);
    }
    targets = q.filter(x => ids.has(x.id));
    const missing = [...ids].filter(i => !q.some(x => x.id === i));
    if (missing.length) console.log(`없는 id (무시함): ${missing.join(', ')}`);
  }
}
// 해설에 정답 선택지가 나오지 않으면 해설과 정답이 어긋났을 수 있음 (괄호 속 보충 설명은 빼고 비교)
const core = s => s.replace(/\(.*?\)/g, '').replace(/\s+/g, '').replace(/[년개°C%]$/, '');
targets.forEach(x => {
  const answer = x.options[x.correctAnswer];
  const flag = x.explanation.replace(/\s+/g, '').includes(core(answer)) ? '' : '  ⚑ 해설에 정답 선택지가 그대로 나오지 않음';
  console.log(`\n[${x.id}] ${x.category} · ${x.difficulty}\n  문제: ${x.question}`);
  x.options.forEach((o, i) => console.log(`  ${i === x.correctAnswer ? '✔' : ' '} ${i + 1}. ${o}`));
  console.log(`  해설: ${x.explanation}${flag}`);
});
console.log(`\n대상 ${targets.length}문제`);
```

대상이 올바르지 않다는 메시지가 나오면 사용법을 보여 주고 멈춥니다. `⚑` 표시는 자동으로 찾은 의심 신호일 뿐이므로 2단계에서 직접 판단합니다 (예: 정답이 "왕건"인데 해설에 "태조"로만 적힌 경우는 문제없음).

## 2단계: 문제마다 정답 검증

대상 문제를 하나씩 아래 네 가지로 확인합니다.

1. **정답이 맞는가?** ✔ 표시된 선택지가 문제의 조건(연도, 기준, 범위)에서 사실인지
2. **다른 보기는 모두 틀렸는가?** 오답 선택지마다, 해석을 달리하거나 기준을 바꾸면 맞을 수 있는지 (예: 면적 대신 인구 기준, 현존 여부, 최신 측정값, 별칭이나 옛 이름)
3. **해설이 사실인가?** 해설 속 연도, 수치, 이름이 맞는지, 정답을 뒷받침하는지, 문제와 어긋나지 않는지
4. **시간이 지나 바뀌지 않았는가?** 수도 이전, 국가 분리·통합, 기록 경신, 재측정, 학설 변화처럼 예전에는 맞았지만 지금은 달라진 내용이 없는지

**출처 확인 기준**

* 연도, 수치, 순위, '가장·최초·최대', 논란이 있을 만한 내용은 반드시 웹 검색으로 **2개 이상의 출처**에서 확인합니다. 백과사전, 공공기관(국가유산청, 우리역사넷, 한국민족문화대백과 등), 학술·공식 기관 자료를 우선합니다.
* 수도, 유명 작품의 작가처럼 널리 알려진 사실은 따로 검색하지 않아도 됩니다. 조금이라도 확신이 없으면 검색합니다.
* 출처끼리 다르면 주류 학설을 따르고, 다른 설이 있다는 점을 보고서에 적습니다.
* 대상이 많으면 비슷한 주제(같은 시대, 같은 지역)의 사실을 한 번의 검색으로 묶어 확인해도 됩니다.

**판정**

* ✅ 문제없음: 네 가지를 모두 통과
* ⚠️ 보완: 정답은 맞지만 다른 해석의 여지가 있거나 해설이 부정확함 (조건 추가, 해설 수정으로 해결)
* ❌ 오류: 표시된 정답이 틀렸거나, 정답이 둘 이상이거나, 해설이 사실과 다름

⚠️와 ❌에는 고칠 방법을 제안합니다. 정답 위치를 바꾸라고 제안할 때는 `options` 순서와 `correctAnswer`를 함께 바꿔야 한다고 적습니다.

## 보고 형식

맨 위에 한 줄 요약(검증한 문제 수, ✅/⚠️/❌ 수)을 적고 아래 순서로 보여 줍니다.

1. **❌ 오류**와 **⚠️ 보완** 표: `판정 | id | 문제(앞부분) | 현재 정답 | 문제점 | 근거 출처 | 수정 제안`. 없으면 "없음"
2. **검색으로 확인한 사실**: `id | 확인한 사실 | 출처` (✅ 문제 포함, 출처는 링크)
3. **참고**: 틀리지는 않았지만 다듬으면 좋은 점 (간단히)

✅ 문제는 2번 목록에만 나오고 따로 나열하지 않습니다.

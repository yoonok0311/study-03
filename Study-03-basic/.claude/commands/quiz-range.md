---
description: 퀴즈 문제를 id 범위로 골라 난이도와 정답 위치 분포를 검토
argument-hint: "[시작 id] [끝 id] (예: 1 11)"
---
<!-- Created: 2026-09-28 15:35 -->

`index.html` 첫 번째 `<script>`의 `quizQuestions`에서 id가 $0번부터 $1번까지인 문제를 골라 난이도 분포와 정답 위치 분포를 확인합니다.

검토 범위: $0 ~ $1

검토만 하고 파일은 수정하지 않습니다.

## 1단계: 집계 (자동)

아래 스크립트를 `Study-03-basic` 폴더에서 Node로 실행합니다. `START`와 `END`에는 위의 검토 범위 숫자를 그대로 넣습니다. 값이 비어 있거나 숫자가 아니면 `NaN`을 넣어 스크립트가 사용법을 보여 주게 합니다.

```js
const fs = require('fs'), vm = require('vm');
const START = NaN, END = NaN;  // 검토 범위 (시작 id, 끝 id)
const html = fs.readFileSync('index.html', 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1] + ';this.q = quizQuestions;', ctx);
const ids = ctx.q.map(x => x.id), minId = Math.min(...ids), maxId = Math.max(...ids);
if (!Number.isInteger(START) || !Number.isInteger(END) || START > END || START < minId || END > maxId) {
  console.log('범위가 올바르지 않음: ' + START + ' ~ ' + END);
  console.log('사용법: /quiz-range 시작id 끝id (가능한 범위 ' + minId + ' ~ ' + maxId + ', 시작 <= 끝)');
  process.exit(1);
}
const targets = ctx.q.filter(x => x.id >= START && x.id <= END);
const LEVELS = ['easy', 'medium', 'hard'];
const pct = (n, total) => (total ? Math.round(n / total * 100) : 0) + '%';

console.log('id | 카테고리 | 난이도 | 정답 위치 | 정답 | 문제');
targets.forEach(x => console.log([x.id, x.category, x.difficulty, x.correctAnswer + 1, x.options[x.correctAnswer], x.question].join(' | ')));

const count = (list, key) => list.reduce((m, x) => (m[key(x)] = (m[key(x)] || 0) + 1, m), {});
const diff = count(targets, x => x.difficulty);
const pos = count(targets, x => x.correctAnswer + 1);
console.log('\n난이도 분포 (' + targets.length + '문제)');
LEVELS.forEach(l => console.log('  ' + l + ': ' + (diff[l] || 0) + ' (' + pct(diff[l] || 0, targets.length) + ')'));
console.log('정답 위치 분포');
[1, 2, 3, 4].forEach(p => console.log('  ' + p + '번: ' + (pos[p] || 0) + ' (' + pct(pos[p] || 0, targets.length) + ')'));

console.log('\n카테고리별');
[...new Set(targets.map(x => x.category))].forEach(c => {
  const list = targets.filter(x => x.category === c);
  const d = count(list, x => x.difficulty), p = count(list, x => x.correctAnswer + 1);
  console.log('  ' + c + ' (' + list.length + '문제) 난이도 ' + LEVELS.map(l => l + ' ' + (d[l] || 0)).join(', ')
    + ' / 정답 위치 ' + [1, 2, 3, 4].map(n => n + '번 ' + (p[n] || 0)).join(', '));
});

let run = 1, longest = { len: 1, pos: targets[0].correctAnswer + 1, from: targets[0].id };
for (let i = 1; i < targets.length; i++) {
  run = targets[i].correctAnswer === targets[i - 1].correctAnswer ? run + 1 : 1;
  if (run > longest.len) longest = { len: run, pos: targets[i].correctAnswer + 1, from: targets[i - run + 1].id };
}
console.log('\nid 순서 기준 같은 정답 위치 최장 연속: ' + longest.pos + '번이 ' + longest.len + '문제 (id ' + longest.from + '부터)');
```

범위가 올바르지 않다는 메시지가 나오면 사용법을 보여 주고 멈춥니다.

## 2단계: 분포 판단

집계 결과를 보고 아래 기준으로 판단합니다.

**난이도 분포**

* 전체 문제 구성 비율은 easy 7 : medium 9 : hard 4 (약 35% : 45% : 20%)입니다. 범위의 비율이 이와 크게 다르면 알려 줍니다.
* 범위가 작으면(10문제 미만) 비율이 쉽게 흔들리므로, 한 난이도가 아예 없을 때만 ⚠️로 둡니다.

**정답 위치 분포**

* 4지선다라 이상적인 비율은 위치마다 25%입니다.
* 한 위치가 40%를 넘거나, 한 번도 정답이 아닌 위치가 있으면 ⚠️로 둡니다 (범위가 8문제 미만이면 참고로만 적음).
* 같은 정답 위치가 4문제 이상 연속되면 ⚠️로 둡니다. "문제 순서 섞기"를 끄면 id 순서로 나오기 때문입니다.

**난이도 표시 적절성**

* 문제마다 내용을 보고 `difficulty`가 적절한지 짧게 판단합니다. 명백히 어긋나는 것(예: 수도 맞히기가 hard, 전문 지식이 필요한데 easy)만 ⚠️로 두고 추천 난이도를 적습니다.

⚠️ 항목에는 고칠 방법을 제안합니다. 정답 위치를 바꾸라고 제안할 때는 `options` 순서와 `correctAnswer`를 함께 바꿔야 한다고 적습니다.

## 보고 형식

맨 위에 한 줄 요약(검토 범위, 문제 수, ⚠️ 수)을 적고 아래 순서로 보여 줍니다.

1. 문제 표: `id | 카테고리 | 난이도 | 정답 위치 | 정답 | 문제 | 난이도 판단` (문제가 길면 앞부분만)
2. 난이도 분포 표: `난이도 | 문제 수 | 비율 | 기준 비율`
3. 정답 위치 분포 표: `위치 | 문제 수 | 비율` (25%에서 크게 벗어난 칸 표시)
4. ⚠️ 항목과 수정 제안 목록 (없으면 "문제 없음")

---
description: 게임 통계 관리 - 통계 계산 점검, 내보낸 기록 파일 분석, 새 통계 항목 추가
argument-hint: "[비우면 점검 | 기록파일.json [플레이어] | 추가 <통계 항목>]"
---
<!-- Created: 2026-09-28 17:10 -->

퀴즈 게임의 플레이 통계(결과 화면, "📊 내 기록" 대시보드)를 관리합니다. 입력: $ARGUMENTS

게임 기록은 사용자 브라우저의 `localStorage`(`quizBasic.history`)에만 있어서 이 명령어가 직접 읽을 수 없습니다. 실제 기록을 분석하려면 먼저 기록 파일을 내보냅니다 (아래 "기록 내보내기").

입력의 첫 단어로 할 일을 고릅니다.

| 입력 | 할 일 | 파일 수정 |
|---|---|---|
| 비어 있음, `점검` | A. 통계 항목과 계산 로직 점검 | 안 함 |
| `.json`으로 끝나는 경로 (뒤에 플레이어 이름 선택) | B. 내보낸 기록 분석 | 안 함 |
| `추가 <통계 항목>` | C. 새 통계 항목 추가 | 함 (커밋은 안 함) |

그 밖의 입력이면 위 표를 사용법으로 보여 주고 멈춥니다.

## 기록 내보내기 (B를 쓰려면)

1. 게임을 한 브라우저에서 사이트를 엽니다. 배포 사이트와 로컬 파일(`file://`)은 기록이 따로 저장되므로, 기록을 쌓은 쪽을 엽니다.
2. `F12` → Console 탭에서 `copy(localStorage.getItem('quizBasic.history'))`를 실행하면 기록이 클립보드에 복사됩니다.
3. 새 파일(예: `Study-03-basic/quiz-history.json`)에 붙여 넣고 저장합니다. `quiz-history*.json`은 `.gitignore`에 있어 커밋되지 않습니다 (플레이어 이름이 들어 있으므로 공개 저장소에 올리지 않음).

## A. 점검 (자동)

아래 스크립트를 `Study-03-basic` 폴더에서 Node로 실행합니다. 화면에 보이는 통계 항목을 뽑고, 기록 저장 스크립트의 `getPlayerStats`를 예제 기록으로 계산해 손으로 계산한 값과 비교합니다.

```js
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');
const src = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('class LocalDataManager'));
const ctx = { module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(src, ctx);
const R = ctx.module.exports;

// 화면 하나 = id가 있는 곳부터 다음 화면(class="screen") 또는 </main>까지
const section = id => {
  const start = html.indexOf('>', html.indexOf(`id="${id}"`)), end = html.slice(start).search(/class="screen|<\/main>/);
  return html.slice(start, start + end);
};
const labels = id => [...section(id).matchAll(/class="stat-label">([^<]+)</g)].map(m => m[1]);
const panels = [...section('statsScreen').matchAll(/<h2 id="\w+">([^<]+)</g)].map(m => m[1]);
console.log('결과 화면 통계:', labels('resultScreen').join(', '));
console.log('내 기록 카드:', labels('statsScreen').join(', '));
console.log('내 기록 패널:', panels.join(', '));
const saveFields = (html.match(/const record = \{([\s\S]*?)\};/) || ['', ''])[1].replace(/\s+/g, ' ').trim();
const resultFields = (html.match(/function buildResult\(\)[\s\S]*?return \{([\s\S]*?)\};/) || ['', ''])[1].match(/\w+(?=:)/g) || [];
console.log('저장되는 필드: buildResult →', resultFields.join(', '), '/ saveResult →', saveFields);

const ok = [], rec = o => ({ mode: 'full', category: null, level: 'all', endedEarly: false, longestStreak: 0, categoryStats: {}, timestamp: new Date().toISOString(), ...o });
const check = (name, pass) => ok.push((pass ? '✅ ' : '❌ ') + name);
const h = [
  rec({ name: 'A', totalScore: 300, totalQuestions: 40, correctAnswers: 30, longestStreak: 8, categoryStats: { 한국사: { correct: 8, total: 10 }, 과학: { correct: 7, total: 10 } } }),
  rec({ name: 'A', totalScore: 40, totalQuestions: 5, correctAnswers: 2, longestStreak: 2, endedEarly: true, categoryStats: { 과학: { correct: 2, total: 5 } } })
];
const s = R.getPlayerStats(h);
check('플레이 횟수(중간 종료 포함) 2', s.plays === 2);
check('푼 문제 45, 정답 32, 정답률 71%', s.answered === 45 && s.correct === 32 && s.accuracy === 71);
check('최장 연속 정답 8', s.longestStreak === 8);
check('카테고리 누적 (과학 9/15)', s.categories['과학'].correct === 9 && s.categories['과학'].total === 15);
check('기록이 없으면 정답률 0', R.getPlayerStats([]).accuracy === 0);
check('예전 기록에 없는 필드도 계산 가능', R.getPlayerStats([{ totalQuestions: 1, correctAnswers: 1 }]).accuracy === 100);
console.log(ok.join('\n'));
```

❌가 있으면 원인(어느 함수의 어느 계산인지)을 찾아 보고하고 고칠 방법을 제안합니다. 직접 고치지는 않습니다.

**보고**: 한 줄 요약(통과/실패 수) 뒤에 통계 항목 표(`화면 | 항목 | 계산 방법(함수)`)와 테스트 결과를 보여 줍니다.

## B. 기록 분석 (자동)

`FILE`에 기록 파일 경로, `PLAYER`에 플레이어 이름(없으면 `''` = 모든 플레이어)을 넣고 `Study-03-basic` 폴더에서 실행합니다.

```js
const fs = require('fs'), vm = require('vm');
const FILE = '', PLAYER = '';
const html = fs.readFileSync('index.html', 'utf8');
const src = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('class LocalDataManager'));
const ctx = { module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(src, ctx);
const R = ctx.module.exports;

if (!fs.existsSync(FILE)) { console.log(`기록 파일이 없음: ${FILE}\n"기록 내보내기" 순서대로 파일을 만든 뒤 경로를 넘겨 주세요.`); process.exit(1); }
let data = JSON.parse(fs.readFileSync(FILE, 'utf8').replace(/^﻿/, '').trim());
if (typeof data === 'string') data = JSON.parse(data);  // 문자열로 한 번 더 감싼 경우
if (!Array.isArray(data)) { console.log('기록 파일은 JSON 배열이어야 합니다.'); process.exit(1); }
const all = data.filter(h => h && typeof h.totalScore === 'number' && h.name && h.mode && h.timestamp);
if (all.length < data.length) console.log(`⚠️ 형식이 맞지 않는 기록 ${data.length - all.length}개는 뺌`);
const MODES = { full: '전체 도전', category: '카테고리 도전', speed: '스피드 퀴즈' }, LEVELS = { all: '전체', easy: '쉬움', hard: '어려움' };
const label = h => [MODES[h.mode] || h.mode, h.category, LEVELS[h.level] || h.level].filter(Boolean).join(' · ');
const avg = a => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : 0);
const day = t => new Date(t).toLocaleDateString('ko-KR');

const names = PLAYER ? [PLAYER] : R.getPlayerNames(all);
console.log(`전체 기록 ${all.length}판, 플레이어 ${R.getPlayerNames(all).length}명, 기간 ${day(all[0].timestamp)} ~ ${day(all[all.length - 1].timestamp)}`);
names.forEach(name => {
  const h = all.filter(x => x.name === name);
  if (!h.length) { console.log(`\n"${name}"의 기록이 없음. 있는 이름: ${R.getPlayerNames(all).join(', ')}`); return; }
  const s = R.getPlayerStats(h), done = h.filter(x => !x.endedEarly);
  console.log(`\n■ ${name}: ${s.plays}판 (끝까지 ${done.length}, 중간 종료 ${s.plays - done.length}), 플레이한 날 ${new Set(h.map(x => day(x.timestamp))).size}일`);
  console.log(`  푼 문제 ${s.answered}, 정답 ${s.correct} (${s.accuracy}%), 최장 연속 ${s.longestStreak}, 평균 응답 ${avg(h.map(x => x.averageResponseTime))}초, 판당 힌트 ${avg(h.map(x => x.hintsUsed || 0))}회`);
  console.log('  카테고리 정답률 (낮은 순):', Object.entries(s.categories).map(([c, v]) => [c, Math.round(v.correct / v.total * 100), v]).sort((a, b) => a[1] - b[1]).map(([c, p, v]) => `${c} ${p}% (${v.correct}/${v.total})`).join(', '));
  const groups = {};
  done.forEach(x => (groups[label(x)] = groups[label(x)] || []).push(x));
  Object.entries(groups).forEach(([g, list]) => {
    const scores = list.map(x => x.totalScore), k = Math.min(3, Math.floor(list.length / 2));
    const trend = k ? ` / 처음 ${k}판 평균 ${avg(scores.slice(0, k))} → 최근 ${k}판 평균 ${avg(scores.slice(-k))}` : '';
    console.log(`  ${g}: ${list.length}판, 최고 ${Math.max(...scores)}점, 평균 ${avg(scores)}점, 평균 정답률 ${avg(list.map(x => x.accuracy))}%${trend}`);
  });
});
```

**보고**: 한 줄 요약(기간, 판 수, 플레이어 수) 뒤에 플레이어마다 표 하나(`항목 | 값`)와 게임 종류별 표(`게임 종류 | 판 수 | 최고 | 평균 | 추이`)를 보여 주고, 마지막에 짧은 해석을 적습니다: 가장 약한 카테고리, 점수가 오르고 있는지, 힌트·응답 시간에서 보이는 특징. 판 수가 적으면(게임 종류별 4판 미만) 추이는 참고용이라고 적습니다.

## C. 새 통계 항목 추가

`추가` 뒤의 내용을 새 통계 항목으로 보고 아래 순서로 구현합니다. 항목이 모호하면(예: "속도") 어떤 값을 어떻게 셀지 한 문장으로 정한 뒤 진행하고, 보고서에 그 정의를 적습니다.

1. **데이터가 있는지 확인**: 이미 저장되는 필드(A의 "저장되는 필드")로 계산할 수 있으면 저장 형식은 건드리지 않습니다. 새 값이 필요하면 `gameState.answers`(문제마다 기록)에서 계산해 `buildResult`에 필드를 추가합니다. 결과 화면에 보일 값이면 `displayResults`에도 표시합니다.
2. **예전 기록 호환**: 이미 저장된 기록에는 새 필드가 없습니다. `getPlayerStats` 등에서 필드가 없을 때를 처리하고(`|| 0`로 합치지 말고 "기록 없음"으로 구분해야 하는 값인지 판단), 화면에는 "기록 없음"처럼 표시합니다.
3. **누적 계산**: 여러 판을 합치는 값이면 기록 저장 스크립트의 `getPlayerStats`에 추가합니다. DOM을 쓰지 않게 유지합니다.
4. **화면**: 대시보드 카드면 `#statsScreen`의 `.dashboard-stats`에 `.stat-card`를 추가하고(4개 단위로 줄이 맞게, 모바일은 2열), 목록·막대면 `.panel` 섹션을 추가합니다. 색은 CSS 변수만 쓰고, 새 색이 필요하면 라이트와 다크 두 곳에 모두 정의합니다. 문구는 한국어로 씁니다.
5. **문서**: `Study-03-basic/CLAUDE.md` "동작 참고"의 결과 화면 또는 내 기록 항목에 새 통계를 적습니다.
6. **확인**: A의 점검 스크립트를 다시 실행하고, 새 항목에 대한 확인 한 줄(`check(...)`)을 이 명령어 파일의 A 스크립트에 추가해 예전 기록(필드 없음)과 새 기록 모두에서 값이 맞는지 봅니다.

**보고**: 추가한 항목의 정의, 바뀐 파일과 위치, 점검 결과. 커밋은 사용자가 요청할 때만 합니다.

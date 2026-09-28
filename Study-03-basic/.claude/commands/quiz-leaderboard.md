---
description: 순위 시스템 관리 - 순위 규칙 점검, 내보낸 기록으로 순위표 보기, 순위 규칙 변경
argument-hint: "[비우면 점검 | 기록파일.json [게임종류] [난이도] [기간] | 변경 <바꿀 규칙>]"
---
<!-- Created: 2026-09-28 17:10 -->

퀴즈 게임의 순위 시스템("🏅 순위표"와 결과 화면의 개인 최고 기록·순위)을 관리합니다. 입력: $ARGUMENTS

순위 계산은 `index.html`의 기록 저장 스크립트(`class LocalDataManager`가 있는 `<script>`)에 있습니다: `LEADERBOARD_SIZE`, `PERIODS`, `boardKeyOf`, `periodStart`/`inPeriod`, `compareRecords`, `isRankable`, `rankRecords`, `getLeaderboard`, `getPersonalBest`. 게임 기록은 사용자 브라우저에만 있으므로, 실제 순위를 보려면 기록 파일을 내보냅니다 (`/quiz-stats`의 "기록 내보내기"와 같은 방법, 파일 이름 `quiz-history*.json`은 커밋되지 않음).

입력의 첫 단어로 할 일을 고릅니다.

| 입력 | 할 일 | 파일 수정 |
|---|---|---|
| 비어 있음, `점검` | A. 현재 규칙 보기와 자체 테스트 | 안 함 |
| `.json`으로 끝나는 경로 (뒤에 게임 종류, 난이도, 기간 선택) | B. 내보낸 기록으로 순위표 보기 | 안 함 |
| `변경 <바꿀 규칙>` | C. 순위 규칙 변경 | 함 (커밋은 안 함) |

그 밖의 입력이면 위 표를 사용법으로 보여 주고 멈춥니다. B의 선택 값:

* 게임 종류: `full`(전체 도전), `speed`(스피드 퀴즈), `category:카테고리`(예: `category:과학`). 한국어로 받으면 이 값으로 바꿉니다.
* 난이도: `all`(전체), `easy`(쉬움), `hard`(어려움)
* 기간: `allTime`(전체 기간, 기본), `weekly`(이번 주), `daily`(오늘). 오늘과 이번 주는 명령을 실행하는 시각 기준입니다.

## A. 점검 (자동)

아래 스크립트를 `Study-03-basic` 폴더에서 Node로 실행합니다. 코드에서 현재 규칙을 그대로 뽑아 보여 주고, 규칙대로 순위가 매겨지는지 테스트합니다.

```js
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');
const src = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('class LocalDataManager'));
const ctx = { module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(src, ctx);
const R = ctx.module.exports, SIZE = vm.runInContext('LEADERBOARD_SIZE', ctx);
const fnSrc = name => (src.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n        }`)) || [`function ${name}: 찾지 못함`])[0];

console.log(`== 현재 규칙 ==\n상위 인원: ${SIZE}명 / 기간: ${Object.entries(R.PERIODS).map(([k, v]) => `${k}=${v}`).join(', ')}\n`);
['boardKeyOf', 'periodStart', 'compareRecords', 'isRankable'].forEach(n => console.log(fnSrc(n) + '\n'));
const hint = (html.match(/<p class="form-hint">(플레이어마다[^<]*)<\/p>/) || ['', '(순위표 안내 문구를 찾지 못함)'])[1];
console.log('순위표 안내 문구:', hint);

let n = 0;
const t0 = Date.UTC(2026, 0, 1);
const rec = o => ({ mode: 'full', category: null, level: 'all', totalQuestions: 40, correctAnswers: 30, accuracy: 75, averageResponseTime: 5, endedEarly: false, timestamp: new Date(t0 + (n++) * 1000).toISOString(), ...o });
const F = { period: 'allTime', board: 'full', level: 'all' };
const results = [], check = (name, pass) => results.push((pass ? '✅ ' : '❌ ') + name);
const names = rows => rows.map(r => r.entry.name + r.rank).join(',');

let lb = R.getLeaderboard([rec({ name: 'A', totalScore: 100 }), rec({ name: 'A', totalScore: 300 }), rec({ name: 'B', totalScore: 200 })], F);
check('플레이어마다 최고 기록 하나만', names(lb) === 'A1,B2' && lb[0].entry.totalScore === 300);
lb = R.getLeaderboard([rec({ name: 'A', totalScore: 200, accuracy: 80 }), rec({ name: 'B', totalScore: 200, accuracy: 90, averageResponseTime: 6 }),
  rec({ name: 'C', totalScore: 200, accuracy: 90, averageResponseTime: 4 }), rec({ name: 'D', totalScore: 200, accuracy: 90, averageResponseTime: 4 }), rec({ name: 'E', totalScore: 100 })], F);
check('점수 → 정답률 → 평균 응답 시간 순, 모두 같으면 같은 순위 (먼저 세운 기록이 앞)', names(lb) === 'C1,D1,B3,A4,E5');
check(`상위 ${SIZE}명까지만`, R.getLeaderboard(Array.from({ length: SIZE + 5 }, (_, k) => rec({ name: 'P' + k, totalScore: k })), F).length === SIZE);
check('중간 종료와 0문제 게임은 제외', R.getLeaderboard([rec({ name: 'X', totalScore: 999, endedEarly: true }), rec({ name: 'Y', totalScore: 5, totalQuestions: 0 })], F).length === 0);
check('게임 종류와 난이도는 따로', R.getLeaderboard([rec({ name: 'S', totalScore: 1, mode: 'speed' }), rec({ name: 'H', totalScore: 1, level: 'hard' })], F).length === 0);
check('카테고리 도전은 카테고리마다', R.boardKeyOf({ mode: 'category', category: '과학' }) === 'category:과학' && R.boardKeyOf({ mode: 'full' }) === 'full');
const at = (d, h) => ({ timestamp: new Date(2026, 8, d, h).toISOString() });  // 2026-09-28이 월요일
const wed = new Date(2026, 8, 30, 15), sun = new Date(2026, 9, 4, 12);
check('오늘 = 그날 0시부터', R.inPeriod(at(30, 0), 'daily', wed) && !R.inPeriod(at(29, 23), 'daily', wed));
check('이번 주 = 월요일 0시부터 (일요일에도 그 주 월요일부터)', R.inPeriod(at(28, 0), 'weekly', wed) && !R.inPeriod(at(27, 23), 'weekly', wed) && R.inPeriod(at(28, 1), 'weekly', sun));
check('전체 기간은 제한 없음', R.inPeriod({ timestamp: '2000-01-01T00:00:00Z' }, 'allTime', wed));
const hist = [rec({ name: 'A', totalScore: 50 }), rec({ name: 'A', totalScore: 80 }), rec({ name: 'A', totalScore: 999, endedEarly: true })];
check('개인 최고 기록은 끝까지 푼 게임 중 최고', R.getPersonalBest(hist, 'A', 'full', 'all').totalScore === 80 && R.getPersonalBest(hist, 'B', 'full', 'all') === null);
console.log('== 자체 테스트 ==\n' + results.join('\n'));
```

❌가 있으면 원인이 코드 버그인지, 규칙을 바꿨는데 이 테스트를 안 고친 것인지 판단해 보고합니다. 직접 고치지는 않습니다.

**보고**: 한 줄 요약(통과/실패 수) 뒤에 현재 규칙 표(`규칙 | 현재 값 | 코드 위치`)와 테스트 결과를 보여 줍니다. 안내 문구가 규칙과 다르면(예: 상위 인원 숫자) ⚠️로 알립니다.

## B. 순위표 보기 (자동)

`FILE`, `BOARD`, `LEVEL`, `PERIOD`를 채우고(비운 값은 가능한 모든 값) `Study-03-basic` 폴더에서 실행합니다.

```js
const fs = require('fs'), vm = require('vm');
const FILE = '', BOARD = '', LEVEL = '', PERIOD = 'allTime';
const html = fs.readFileSync('index.html', 'utf8');
const src = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('class LocalDataManager'));
const ctx = { module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(src, ctx);
const R = ctx.module.exports;

if (!fs.existsSync(FILE)) { console.log(`기록 파일이 없음: ${FILE}\n/quiz-stats의 "기록 내보내기" 순서대로 파일을 만든 뒤 경로를 넘겨 주세요.`); process.exit(1); }
let data = JSON.parse(fs.readFileSync(FILE, 'utf8').replace(/^﻿/, '').trim());
if (typeof data === 'string') data = JSON.parse(data);
if (!Array.isArray(data)) { console.log('기록 파일은 JSON 배열이어야 합니다.'); process.exit(1); }
const all = data.filter(h => h && typeof h.totalScore === 'number' && h.name && h.mode && h.timestamp);
if (!R.PERIODS[PERIOD]) { console.log(`기간은 ${Object.keys(R.PERIODS).join(', ')} 중 하나`); process.exit(1); }
const early = all.filter(h => h.endedEarly).length;
console.log(`기록 ${all.length}판 (형식 오류 ${data.length - all.length}, 중간 종료 ${early}판은 순위 제외), 플레이어 ${R.getPlayerNames(all).length}명, 기간: ${R.PERIODS[PERIOD]}`);

const boards = BOARD ? [BOARD] : [...new Set(all.map(R.boardKeyOf))];
const levels = LEVEL ? [LEVEL] : ['all', 'easy', 'hard'];
let shown = 0;
boards.forEach(board => levels.forEach(level => {
  const ranked = R.rankRecords(all, { period: PERIOD, board, level });
  if (!ranked.length) return;
  shown++;
  console.log(`\n■ ${board} · ${level} (${ranked.length}명 중 상위 ${Math.min(ranked.length, R.getLeaderboard(all, { period: PERIOD, board, level }).length)}명)`);
  R.getLeaderboard(all, { period: PERIOD, board, level }).forEach(({ rank, entry: e }) => {
    const plays = all.filter(h => h.name === e.name && R.boardKeyOf(h) === board && h.level === level && !h.endedEarly).length;
    console.log(`  ${rank}위 | ${e.name} | ${e.totalScore}점 | ${e.accuracy}% | 평균 ${e.averageResponseTime}초 | ${new Date(e.timestamp).toLocaleString('ko-KR')} | ${plays}판 중 최고`);
  });
}));
if (!shown) console.log('\n조건에 맞는 순위 기록이 없음');
```

**보고**: 한 줄 요약 뒤에 순위표마다 표(`순위 | 이름 | 점수 | 정답률 | 평균 응답 | 날짜 | 판 수`)를 보여 줍니다. 같은 순위가 있으면 어떤 기준까지 같은지 짧게 설명합니다.

## C. 순위 규칙 변경

`변경` 뒤의 내용(예: "상위 20명", "주 시작을 일요일로", "정답률을 점수보다 먼저 비교", "중간 종료 게임도 순위에 포함", "최근 30일 기간 추가")을 반영합니다. 요청이 모호하면 어떻게 바꿀지 한 문장으로 정하고 보고서에 적습니다.

1. **코드**: 기록 저장 스크립트의 해당 상수·함수를 고칩니다. DOM을 쓰지 않게 유지합니다. 기간을 추가하면 `PERIODS`와 `periodStart`를 함께 고칩니다 (순위표의 기간 버튼은 `PERIODS`에서 자동으로 만들어짐).
2. **화면 문구**: `#leaderboardScreen`의 안내 문구(`플레이어마다 가장 좋은 기록 하나만 상위 10명까지…`)와 빈 목록 문구, 결과 화면 배너(`showRecordBanner`)가 새 규칙과 맞는지 확인하고 고칩니다.
3. **문서**: `Study-03-basic/CLAUDE.md` "동작 참고"의 순위표 항목, 저장소 루트 `README.md` 비교표의 "기록과 순위" 칸을 고칩니다.
4. **테스트**: 이 명령어 파일 A 스크립트의 테스트 기대값을 새 규칙에 맞게 고치고, 바뀐 규칙을 직접 확인하는 `check(...)` 한 줄을 추가한 뒤 A를 실행해 모두 ✅인지 봅니다.

**보고**: 바꾼 규칙(전 → 후), 바뀐 파일과 위치, 점검 결과. 이미 저장된 기록에도 새 규칙이 바로 적용된다는 점(순위는 저장값이 아니라 매번 계산함)을 알려 줍니다. 커밋은 사용자가 요청할 때만 합니다.

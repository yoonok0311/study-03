---
description: 선생님 모드 - 반 전체 학생 성적표 (정답률 순위, 반 평균, 살펴볼 학생)
argument-hint: "[게임 종류: 전체|full|speed|category|category:카테고리] [기간: allTime|weekly|daily]"
---
<!-- Created: 2026-09-28 18:06 -->

`teacher/class.json`(`/teacher-collect`로 만든 반 기록)으로 반 전체 학생의 성적을 한 표로 보여 주고, 반 평균과 비교해 살펴볼 학생을 표시합니다. 입력: $ARGUMENTS

* 입력은 게임 종류와 기간이고 둘 다 선택입니다. 순서는 상관없고, 한국어로 받으면 아래 값으로 바꿉니다. 알 수 없는 값이면 사용법(`/teacher-overview [게임 종류] [기간]`)과 아래 목록을 보여 주고 멈춥니다.
  * 게임 종류(`BOARD`): 비우거나 `전체` → `''`(모든 게임), `전체 도전` → `full`, `스피드` → `speed`, `카테고리 도전` → `category`(모든 카테고리), `과학` 같은 카테고리 이름 → `category:과학`
  * 기간(`PERIOD`): `allTime`(전체 기간, 기본), `weekly`(이번 주, 월요일부터), `daily`(오늘). 명령을 실행하는 시각 기준
* 스크립트는 `Study-03-basic` 폴더에서 Node로 실행합니다. 셸 heredoc은 `\\`를 바꿀 수 있으므로 Write 도구로 임시 파일(scratchpad)에 저장해 실행합니다.
* 파일을 수정하지 않습니다.

## 기준

* **정답률**은 게임 종류가 달라도 비교할 수 있어서 순위의 기준입니다 (푼 문제를 모두 합쳐 계산, 중간에 그만둔 게임도 푼 문제까지 포함). 같으면 푼 문제가 많은 순이고, 정답률이 같으면 같은 순위입니다.
* **점수**는 모드마다 문제 수가 달라 모드끼리 비교할 수 없으므로 "전체 도전 · 전체 난이도"에서 끝까지 푼 게임의 최고 점수만 따로 보여 줍니다.
* 반 평균과 중앙값은 `MIN_ANSWERED`(20문제) 이상 푼 학생의 정답률로 계산합니다 (그런 학생이 없으면 모든 학생).
* 표시: `🔻` 반 평균보다 `LOW_GAP`(15%p) 이상 낮음, `📉`/`📈` 앞쪽 절반 판보다 뒤쪽 절반 판의 정답률이 `TREND_GAP`(5%p) 이상 낮음/높음 (4판 이상일 때), `💤` 마지막 플레이가 `IDLE_DAYS`(7일) 이상 전 (기간 조건과 상관없이 전체 기록 기준), `🔸` 푼 문제가 `MIN_ANSWERED` 미만이라 순위에서 뺌

## 스크립트

```js
const fs = require('fs'), vm = require('vm');
const BOARD = '';          // '' 모든 게임 | full | speed | category | category:과학
const PERIOD = 'allTime';  // allTime | weekly | daily
const CLASS = 'teacher/class.json';
const LOW_GAP = 15, TREND_GAP = 5, IDLE_DAYS = 7, MIN_ANSWERED = 20;
const fail = m => { console.log('실패: ' + m); process.exit(1); };
const html = fs.readFileSync('index.html', 'utf8');
const src = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('class LocalDataManager'));
const ctx = { module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(src, ctx);
const R = ctx.module.exports;
if (!fs.existsSync(CLASS)) fail(`${CLASS}가 없음. 먼저 /teacher-collect로 학생 기록을 모으세요.`);
const all = JSON.parse(fs.readFileSync(CLASS, 'utf8')).records;
if (!R.PERIODS[PERIOD]) fail(`기간은 ${Object.keys(R.PERIODS).join(', ')} 중 하나 (받은 값: ${PERIOD})`);
const MODES = { full: '전체 도전', speed: '스피드 퀴즈', category: '카테고리 도전 전체' };
const boardName = !BOARD ? '모든 게임' : BOARD.startsWith('category:') ? `카테고리 도전 · ${BOARD.slice(9)}` : MODES[BOARD];
if (!boardName) fail(`게임 종류는 '', full, speed, category, category:카테고리 중 하나 (받은 값: ${BOARD})`);
const boardOk = h => !BOARD || (BOARD === 'category' ? h.mode === 'category' : R.boardKeyOf(h) === BOARD);
const list = all.filter(h => boardOk(h) && R.inPeriod(h, PERIOD));

const DAY = 864e5, now = Date.now();
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const pct = (c, t) => (t ? Math.round(c / t * 100) : 0);
const accOf = a => pct(sum(a, x => x.correctAnswers), sum(a, x => x.totalQuestions));
const day = t => new Date(t).toLocaleDateString('ko-KR');
const names = R.getPlayerNames(all);
const rows = names.map(name => {
  const mine = list.filter(h => h.name === name);
  if (!mine.length) return null;
  const s = R.getPlayerStats(mine), half = Math.floor(mine.length / 2), best = R.getPersonalBest(mine, name, 'full', 'all');
  const last = all.filter(h => h.name === name).pop().timestamp;
  return {
    name, plays: s.plays, early: mine.filter(h => h.endedEarly).length, answered: s.answered, accuracy: s.accuracy,
    avgTime: Math.round(sum(mine, h => (h.averageResponseTime || 0) * h.totalQuestions) / s.answered * 10) / 10,
    hints: Math.round(sum(mine, h => h.hintsUsed || 0) / s.plays * 10) / 10, streak: s.longestStreak,
    fullBest: best ? best.totalScore : null, trend: mine.length >= 4 ? accOf(mine.slice(-half)) - accOf(mine.slice(0, half)) : null,
    idle: Math.floor((now - new Date(last)) / DAY)
  };
}).filter(Boolean);
const absent = names.filter(n => !rows.some(r => r.name === n));
console.log(`[조건] ${boardName} · ${R.PERIODS[PERIOD]} / 반 기록 전체 ${all.length}판, 학생 ${names.length}명`);
if (!rows.length) { console.log('조건에 맞는 기록이 없음'); process.exit(0); }

const enough = rows.filter(r => r.answered >= MIN_ANSWERED), base = (enough.length ? enough : rows).map(r => r.accuracy).sort((a, b) => a - b);
const mean = Math.round(sum(base, x => x) / base.length);
const median = base.length % 2 ? base[(base.length - 1) / 2] : Math.round((base[base.length / 2 - 1] + base[base.length / 2]) / 2);
const ranked = [...enough].sort((a, b) => b.accuracy - a.accuracy || b.answered - a.answered);
ranked.forEach((r, i) => { r.rank = i && ranked[i - 1].accuracy === r.accuracy ? ranked[i - 1].rank : i + 1; });
const order = [...ranked, ...rows.filter(r => r.answered < MIN_ANSWERED).sort((a, b) => b.accuracy - a.accuracy)];
const flags = r => [r.answered < MIN_ANSWERED && '🔸표본 적음', r.answered >= MIN_ANSWERED && r.accuracy <= mean - LOW_GAP && '🔻평균보다 낮음',
  r.trend !== null && r.trend <= -TREND_GAP && '📉하락', r.trend !== null && r.trend >= TREND_GAP && '📈상승', r.idle >= IDLE_DAYS && `💤${r.idle}일 쉼`].filter(Boolean);
const signed = n => (n === null ? '-' : (n > 0 ? '+' : '') + n + '%p');

console.log(`[반 요약] 학생 ${rows.length}명${absent.length ? ` (이 조건에 기록 없는 학생 ${absent.length}명: ${absent.join(', ')})` : ''}, 기록 ${list.length}판 (중간 종료 ${list.filter(h => h.endedEarly).length}), ${day(list[0].timestamp)} ~ ${day(list[list.length - 1].timestamp)}`);
console.log(`  반 평균 정답률 ${mean}% (중앙값 ${median}%, 문제 합산 ${accOf(list)}%), 최고 ${base[base.length - 1]}%, 최저 ${base[0]}% (${enough.length ? `${MIN_ANSWERED}문제 이상 푼 ${enough.length}명 기준` : '모든 학생 기준'})`);
console.log(`  최근 ${IDLE_DAYS}일 안에 플레이한 학생 ${rows.filter(r => r.idle < IDLE_DAYS).length}/${rows.length}명, 푼 문제 합계 ${sum(rows, r => r.answered)}`);
console.log('[학생별] 순위 | 이름 | 정답률 | 반 평균과 차이 | 푼 문제 | 판 수(중간 종료) | 평균 응답 | 판당 힌트 | 최장 연속 | 전체 도전 최고 | 추이 | 마지막 플레이 | 표시');
order.forEach(r => console.log(`  ${r.rank || '-'} | ${r.name} | ${r.accuracy}% | ${signed(r.accuracy - mean)} | ${r.answered} | ${r.plays}(${r.early}) | ${r.avgTime}초 | ${r.hints} | ${r.streak} | ${r.fullBest ?? '-'} | ${signed(r.trend)} | ${r.idle ? r.idle + '일 전' : '오늘'} | ${flags(r).join(' ') || '-'}`));
const watch = order.filter(r => flags(r).some(f => !f.startsWith('📈')));
console.log(`[살펴볼 학생] ${watch.length ? watch.map(r => `${r.name}(${flags(r).filter(f => !f.startsWith('📈')).join(', ')})`).join(', ') : '없음'}`);
console.log('성적표 완료');
```

**통과 조건**: `성적표 완료` 또는 `조건에 맞는 기록이 없음`이 출력됨. `실패:`가 나오면 그 줄을 그대로 보고하고 멈춥니다.

**보고**: 조건과 반 요약을 한두 줄로 적고, 학생별 줄을 마크다운 표로 옮깁니다. 이어서 짧은 해석을 적습니다: 상위·하위 학생, 반 평균과 크게 차이 나는 학생, 하락 중이거나 오래 쉰 학생, 힌트나 응답 시간이 눈에 띄는 학생. 판 수가 적은 학생(4판 미만)의 추이는 없다고 적습니다. 학생 몇 명을 자세히 보려면 `/teacher-compare 이름1 이름2`, 카테고리 약점은 `/teacher-weak`를 안내합니다.

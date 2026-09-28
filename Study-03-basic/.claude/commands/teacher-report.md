---
description: 선생님 모드 - 반 성적을 한눈에 보는 HTML 리포트 파일 만들기 (성적표, 카테고리 히트맵, 정답률 추이)
argument-hint: "[리포트 제목, 비우면 \"우리 반 퀴즈 성적\"]"
---
<!-- Created: 2026-09-28 18:06 -->

`teacher/class.json`(`/teacher-collect`로 만든 반 기록)으로 브라우저에서 바로 여는 HTML 리포트 한 장을 만듭니다. 입력: $ARGUMENTS

* 입력은 리포트 제목이고 선택입니다. 비우면 `우리 반 퀴즈 성적`입니다.
* 스크립트는 `Study-03-basic` 폴더에서 Node로 실행합니다. 셸 heredoc은 `\\`를 바꿀 수 있으므로 Write 도구로 임시 파일(scratchpad)에 저장해 실행합니다. 대문자 상수 `TITLE`은 입력 값으로 채웁니다 (JS 문자열로 이스케이프).
* 결과는 `teacher/reports/report-날짜-시각.html`에 새로 만들고 이전 리포트는 지우지 않습니다. 학생 이름이 들어 있으므로 `teacher/`가 저장소 루트 `.gitignore`에 있어야 하고, 공개된 곳에 올리지 않습니다. 커밋은 하지 않습니다.

## 리포트 내용

한 파일에 CSS와 스크립트를 모두 담고(외부 파일·CDN 없음), 시스템 다크 모드를 따르며, 휴대폰 폭에서는 표가 가로로 스크롤됩니다.

1. **요약 카드**: 학생 수, 반 평균 정답률(중앙값), 푼 문제 합계, 최근 7일 활동 학생, 살펴볼 학생 수
2. **학생별 성적표**: `/teacher-overview`와 같은 기준(모든 게임, 전체 기간)의 순위, 정답률 막대, 푼 문제, 판 수, 평균 응답, 판당 힌트, 최장 연속, 전체 도전 최고 점수, 추이, 마지막 플레이, 표시(🔻📉📈💤🔸), 판별 정답률 추이선(점선은 반 평균). 머리글을 누르면 그 열로 정렬
3. **카테고리 히트맵**: 학생 × 카테고리 정답률을 5단계 색(50% 미만 / 50~64 / 65~79 / 80~89 / 90 이상)으로. `/teacher-weak`와 같은 기준으로 도움이 필요한 칸에 ⚠, `MIN_CAT` 미만 칸은 문제 수만 표시. 맨 아래 줄은 반 정답률
4. **도움이 필요한 학생**: 학생마다 ⚠ 카테고리와 표시
5. **바닥글**: 수집 시각, 원본 파일 수, 기준값

## 스크립트

```js
const fs = require('fs'), vm = require('vm'), path = require('path');
const TITLE = '우리 반 퀴즈 성적';
const CLASS = 'teacher/class.json', OUT_DIR = path.join('teacher', 'reports');
const LOW_GAP = 15, TREND_GAP = 5, IDLE_DAYS = 7, MIN_ANSWERED = 20, MIN_CAT = 5, LOW_ABS = 50;
const fail = m => { console.log('실패: ' + m); process.exit(1); };
if (!fs.readFileSync('../.gitignore', 'utf8').split(/\r?\n/).some(l => /^\/?(Study-03-basic\/)?teacher\/?$/.test(l.trim()))) fail('.gitignore에 Study-03-basic/teacher/가 없음 (학생 이름이 저장소에 올라갈 수 있음)');
const html = fs.readFileSync('index.html', 'utf8');
const plain = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const ctx = { module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(plain[0] + ';this.q = quizQuestions;', ctx);
vm.runInContext(plain.find(s => s.includes('class LocalDataManager')), ctx);
const R = ctx.module.exports;
if (!fs.existsSync(CLASS)) fail(`${CLASS}가 없음. 먼저 /teacher-collect로 학생 기록을 모으세요.`);
const data = JSON.parse(fs.readFileSync(CLASS, 'utf8')), all = data.records;
if (!all.length) fail('반 기록이 비어 있음');

// ----- 계산 (/teacher-overview, /teacher-weak와 같은 기준) -----
const DAY = 864e5, now = new Date();
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const pct = (c, t) => (t ? Math.round(c / t * 100) : null);
const accOf = a => pct(sum(a, x => x.correctAnswers), sum(a, x => x.totalQuestions));
const names = R.getPlayerNames(all);
const of = n => all.filter(h => h.name === n);
const rows = names.map(name => {
  const mine = of(name), s = R.getPlayerStats(mine), half = Math.floor(mine.length / 2), best = R.getPersonalBest(mine, name, 'full', 'all');
  return {
    name, plays: s.plays, early: mine.filter(h => h.endedEarly).length, answered: s.answered, accuracy: s.accuracy,
    avgTime: Math.round(sum(mine, h => (h.averageResponseTime || 0) * h.totalQuestions) / s.answered * 10) / 10,
    hints: Math.round(sum(mine, h => h.hintsUsed || 0) / s.plays * 10) / 10, streak: s.longestStreak,
    fullBest: best ? best.totalScore : null, trend: mine.length >= 4 ? accOf(mine.slice(-half)) - accOf(mine.slice(0, half)) : null,
    idle: Math.floor((now - new Date(mine[mine.length - 1].timestamp)) / DAY), series: mine.map(h => h.accuracy)
  };
});
const enough = rows.filter(r => r.answered >= MIN_ANSWERED), base = (enough.length ? enough : rows).map(r => r.accuracy).sort((a, b) => a - b);
const mean = Math.round(sum(base, x => x) / base.length);
const median = base.length % 2 ? base[(base.length - 1) / 2] : Math.round((base[base.length / 2 - 1] + base[base.length / 2]) / 2);
const ranked = [...enough].sort((a, b) => b.accuracy - a.accuracy || b.answered - a.answered);
ranked.forEach((r, i) => { r.rank = i && ranked[i - 1].accuracy === r.accuracy ? ranked[i - 1].rank : i + 1; });
const order = [...ranked, ...rows.filter(r => r.answered < MIN_ANSWERED).sort((a, b) => b.accuracy - a.accuracy)];
const flagsOf = r => [r.answered < MIN_ANSWERED && '🔸 표본 적음', r.answered >= MIN_ANSWERED && r.accuracy <= mean - LOW_GAP && '🔻 평균보다 낮음',
  r.trend !== null && r.trend <= -TREND_GAP && '📉 하락', r.trend !== null && r.trend >= TREND_GAP && '📈 상승', r.idle >= IDLE_DAYS && `💤 ${r.idle}일 쉼`].filter(Boolean);
const CATS = [...new Set([...ctx.q.map(x => x.category), ...all.flatMap(h => Object.keys(h.categoryStats || {}))])];
const cat = (a, c) => ({ correct: sum(a, h => h.categoryStats?.[c]?.correct || 0), total: sum(a, h => h.categoryStats?.[c]?.total || 0) });
const classCat = Object.fromEntries(CATS.map(c => { const x = cat(all, c); return [c, pct(x.correct, x.total)]; }));
const cell = (n, c) => { const x = cat(of(n), c), acc = pct(x.correct, x.total); return { total: x.total, acc, weak: x.total >= MIN_CAT && (acc <= classCat[c] - LOW_GAP || acc < LOW_ABS) }; };
const watch = order.filter(r => flagsOf(r).some(f => !f.startsWith('📈')) || CATS.some(c => cell(r.name, c).weak));

// ----- HTML -----
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const heat = a => (a === null ? 'na' : a >= 90 ? 'h4' : a >= 80 ? 'h3' : a >= 65 ? 'h2' : a >= 50 ? 'h1' : 'h0');
const signed = n => (n === null ? '-' : (n > 0 ? '+' : '') + n + '%p');
const td = (v, text = v) => `<td data-v="${v ?? -1}">${text ?? '-'}</td>`;
const spark = s => {
  const W = 96, H = 30, y = v => (H - 3 - v / 100 * (H - 6)).toFixed(1), x = i => (s.length === 1 ? W / 2 : i / (s.length - 1) * (W - 6) + 3).toFixed(1);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="판별 정답률 ${s.join(', ')}%">` +
    `<line x1="0" x2="${W}" y1="${y(mean)}" y2="${y(mean)}" class="mean"/><polyline points="${s.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>` +
    `<circle cx="${x(s.length - 1)}" cy="${y(s[s.length - 1])}" r="2.5"/></svg>`;
};
const d = now, p = n => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
const day = t => new Date(t).toLocaleDateString('ko-KR');
const cards = [
  ['학생', `${rows.length}명`, `기록 ${all.length}판`],
  ['반 평균 정답률', `${mean}%`, `중앙값 ${median}%`],
  ['푼 문제', `${sum(rows, r => r.answered)}`, `문제 합산 정답률 ${accOf(all)}%`],
  [`최근 ${IDLE_DAYS}일 활동`, `${rows.filter(r => r.idle < IDLE_DAYS).length}/${rows.length}명`, `마지막 기록 ${day(all[all.length - 1].timestamp)}`],
  ['살펴볼 학생', `${watch.length}명`, '표시나 ⚠ 카테고리가 있는 학생']
];
const studentRows = order.map(r => `<tr class="student">${td(r.rank ?? 999, r.rank ?? '-')}<td class="name">${esc(r.name)}</td>` +
  `<td data-v="${r.accuracy}"><div class="acc"><span class="bar"><span style="width:${r.accuracy}%"></span></span>${r.accuracy}%</div></td>` +
  td(r.accuracy - mean, signed(r.accuracy - mean)) + td(r.answered) + td(r.plays, `${r.plays}${r.early ? ` <small>(${r.early})</small>` : ''}`) +
  td(r.avgTime, `${r.avgTime}초`) + td(r.hints) + td(r.streak) + td(r.fullBest) + td(r.trend ?? -999, signed(r.trend)) +
  td(r.idle, r.idle ? `${r.idle}일 전` : '오늘') + `<td class="flags">${flagsOf(r).map(esc).join('<br>') || '-'}</td><td>${spark(r.series)}</td></tr>`).join('\n');
const heatRows = order.map(r => `<tr class="heat-row"><td class="name">${esc(r.name)}</td>${CATS.map(c => {
  const x = cell(r.name, c);
  if (!x.total) return '<td class="na" data-v="-1">-</td>';
  if (x.total < MIN_CAT) return `<td class="na" data-v="-1"><small>${x.total}문제</small></td>`;
  return `<td class="${heat(x.acc)}" data-v="${x.acc}">${x.acc}%${x.weak ? ' ⚠' : ''}</td>`;
}).join('')}</tr>`).join('\n');
const helpItems = watch.map(r => {
  const weakCats = CATS.filter(c => cell(r.name, c).weak).map(c => `${c} ${cell(r.name, c).acc}%`);
  return `<li><strong>${esc(r.name)}</strong> — ${[...flagsOf(r).filter(f => !f.startsWith('📈')), ...weakCats.map(w => '⚠ ' + w)].map(esc).join(', ')}</li>`;
}).join('\n');

const page = `<!doctype html>
<!-- Created: ${stamp} (teacher-report) -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TITLE)}</title>
<style>
:root { --bg: #f6f5fb; --card: #ffffff; --text: #1f1d2b; --muted: #6b6880; --line: #e4e1ef; --accent: #6c5ce7; --accent-soft: #e4e0fb;
  --h0: #f6c9cd; --h1: #fbdcb8; --h2: #fcefb4; --h3: #cdeed7; --h4: #9fdcb3; --na: #efeef3; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #16151d; --card: #211f2b; --text: #ecebf3; --muted: #a19eb3;
  --line: #353245; --accent: #a29bfe; --accent-soft: #37335a; --h0: #6a2a30; --h1: #6a4420; --h2: #5a5019; --h3: #245433; --h4: #2f7446; --na: #2a2836; } }
:root[data-theme="dark"] { --bg: #16151d; --card: #211f2b; --text: #ecebf3; --muted: #a19eb3; --line: #353245; --accent: #a29bfe; --accent-soft: #37335a;
  --h0: #6a2a30; --h1: #6a4420; --h2: #5a5019; --h3: #245433; --h4: #2f7446; --na: #2a2836; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, -apple-system, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; }
main { max-width: 1200px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { margin: 0 0 4px; font-size: 1.6rem; } h2 { font-size: 1.15rem; margin: 32px 0 12px; }
.sub, small, footer { color: var(--muted); }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-top: 20px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
.card .label { color: var(--muted); font-size: .85rem; } .card .value { font-size: 1.6rem; font-weight: 700; } .card .note { color: var(--muted); font-size: .8rem; }
.scroll { overflow-x: auto; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
th, td { padding: 8px; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
th { font-size: .82rem; color: var(--muted); font-weight: 600; background: var(--card); position: sticky; top: 0; }
th button { all: unset; cursor: pointer; } th button:focus-visible { outline: 2px solid var(--accent); }
th[data-dir="desc"] button::after { content: " ▼"; } th[data-dir="asc"] button::after { content: " ▲"; }
td.name, th.name { text-align: left; font-weight: 600; } td.flags { text-align: left; font-size: .85rem; }
tbody tr:last-child td { border-bottom: 0; }
.acc { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
.bar { width: 56px; height: 8px; border-radius: 4px; background: var(--accent-soft); overflow: hidden; display: inline-block; }
.bar > span { display: block; height: 100%; background: var(--accent); }
.spark { display: block; } .spark polyline { fill: none; stroke: var(--accent); stroke-width: 1.8; } .spark circle { fill: var(--accent); }
.spark .mean { stroke: var(--muted); stroke-dasharray: 3 3; stroke-width: 1; }
.heat td, .heat th { text-align: center; } .heat td.name, .heat th.name { text-align: left; }
.h0 { background: var(--h0); } .h1 { background: var(--h1); } .h2 { background: var(--h2); } .h3 { background: var(--h3); } .h4 { background: var(--h4); } .na { background: var(--na); color: var(--muted); }
.class-row td { font-weight: 700; border-top: 2px solid var(--line); }
.legend { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 0; font-size: .8rem; color: var(--muted); }
.legend span { padding: 2px 8px; border-radius: 6px; color: var(--text); }
ul.help { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px 16px 12px 32px; margin: 0; }
ul.help li { margin: 4px 0; }
footer { margin-top: 32px; font-size: .8rem; }
</style>
</head>
<body>
<main>
<h1>${esc(TITLE)}</h1>
<div class="sub">${esc(stamp)} 생성 · 기록 기간 ${esc(day(all[0].timestamp))} ~ ${esc(day(all[all.length - 1].timestamp))} · 모든 게임, 전체 기간</div>
<section class="cards">${cards.map(([l, v, n]) => `<div class="card"><div class="label">${esc(l)}</div><div class="value">${esc(v)}</div><div class="note">${esc(n)}</div></div>`).join('')}</section>

<h2>학생별 성적</h2>
<div class="scroll"><table class="sortable">
<thead><tr><th><button>순위</button></th><th class="name"><button>이름</button></th><th><button>정답률</button></th><th><button>평균과 차이</button></th><th><button>푼 문제</button></th><th><button>판 수 <small>(중간 종료)</small></button></th><th><button>평균 응답</button></th><th><button>판당 힌트</button></th><th><button>최장 연속</button></th><th><button>전체 도전 최고</button></th><th><button>추이</button></th><th><button>마지막 플레이</button></th><th class="name">표시</th><th class="name">판별 정답률</th></tr></thead>
<tbody>
${studentRows}
</tbody></table></div>
<p class="sub">순위는 ${MIN_ANSWERED}문제 이상 푼 학생의 정답률 순입니다 (같으면 같은 순위). 점수는 모드마다 문제 수가 달라 "전체 도전 · 전체 난이도"의 최고 점수만 보여 줍니다. 추이는 앞쪽 절반 판과 뒤쪽 절반 판의 정답률 차이이고(4판 이상), 추이선의 점선은 반 평균 ${mean}%입니다.</p>

<h2>카테고리별 정답률</h2>
<div class="scroll"><table class="heat sortable">
<thead><tr><th class="name"><button>이름</button></th>${CATS.map(c => `<th><button>${esc(c)}</button></th>`).join('')}</tr></thead>
<tbody>
${heatRows}
</tbody>
<tfoot><tr class="class-row"><td class="name">반 전체</td>${CATS.map(c => `<td class="${heat(classCat[c])}">${classCat[c] === null ? '-' : classCat[c] + '%'}</td>`).join('')}</tr></tfoot>
</table></div>
<div class="legend"><span class="h0">50% 미만</span><span class="h1">50~64%</span><span class="h2">65~79%</span><span class="h3">80~89%</span><span class="h4">90% 이상</span><span class="na">${MIN_CAT}문제 미만</span> ⚠ 반 정답률보다 ${LOW_GAP}%p 이상 낮거나 ${LOW_ABS}% 미만</div>

<h2>살펴볼 학생</h2>
${helpItems ? `<ul class="help">\n${helpItems}\n</ul>` : '<p class="sub">표시나 ⚠ 카테고리가 있는 학생이 없습니다.</p>'}

<footer>반 기록 수집 ${esc(new Date(data.collectedAt).toLocaleString('ko-KR'))} · 원본 파일 ${(data.sources || []).length}개 · 문제별 답은 기록에 저장되지 않아 카테고리 단위로만 분석합니다 · 학생 이름이 들어 있으니 공개된 곳에 올리지 마세요.</footer>
</main>
<script>
document.querySelectorAll('table.sortable').forEach(function (t) {
  t.querySelectorAll('thead th').forEach(function (th, i) {
    var b = th.querySelector('button');
    if (!b) return;
    b.addEventListener('click', function () {
      var body = t.tBodies[0], rows = Array.prototype.slice.call(body.rows), dir = th.dataset.dir === 'desc' ? 1 : -1;
      t.querySelectorAll('thead th').forEach(function (x) { delete x.dataset.dir; });
      th.dataset.dir = dir === -1 ? 'desc' : 'asc';
      var val = function (r) { var c = r.cells[i]; return c.dataset.v === undefined ? c.textContent : Number(c.dataset.v); };
      rows.sort(function (a, b) { var x = val(a), y = val(b); return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'ko')) * dir; });
      rows.forEach(function (r) { body.appendChild(r); });
    });
  });
});
</script>
</body>
</html>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
const file = path.join(OUT_DIR, `report-${stamp.replace(/[-: ]/g, '').replace(/^(\d{8})/, '$1-')}${p(d.getSeconds())}.html`);
if (fs.existsSync(file)) fail(`${file}가 이미 있음`);
fs.writeFileSync(file, page);
const back = fs.readFileSync(file, 'utf8');
const count = re => (back.match(re) || []).length;
if (count(/<tr class="student">/g) !== rows.length) fail('성적표 줄 수가 학생 수와 다름');
if (count(/<tr class="heat-row">/g) !== rows.length) fail('히트맵 줄 수가 학생 수와 다름');
const missingName = names.find(n => !back.includes(esc(n)));
if (missingName) fail(`리포트에 학생 이름이 없음: ${missingName}`);
if (/NaN|undefined|\[object /.test(back.replace(/<script>[\s\S]*<\/script>/, ''))) fail('리포트에 NaN, undefined 같은 잘못된 값이 있음');
console.log(`학생 ${rows.length}명, 카테고리 ${CATS.length}개, 반 평균 ${mean}%, 살펴볼 학생 ${watch.length}명: ${watch.map(r => r.name).join(', ') || '없음'}`);
console.log(`리포트 완료: ${file} (${(fs.statSync(file).size / 1024).toFixed(1)}KB) → file:///${path.resolve(file).replace(/\\/g, '/').replace(/^\//, '')}`);
```

**통과 조건**: `리포트 완료`가 출력됨. `실패:`가 나오면 그 줄을 그대로 보고하고, 만들다 만 리포트 파일이 있으면 지운 뒤 멈춥니다.

**보고**: 리포트 경로와 크기, 여는 방법(파일을 더블클릭하거나 출력된 `file:///` 주소를 브라우저에 붙여 넣기)을 적고, 리포트에 담긴 내용(요약 카드 수치, 살펴볼 학생)을 몇 줄로 요약합니다. 리포트를 다른 사람에게 보낼 때는 학생 이름이 들어 있다는 점을 알립니다.

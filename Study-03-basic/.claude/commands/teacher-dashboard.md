---
description: 선생님 모드 - 반 성적을 카드 격자로 보는 HTML 대시보드 만들기 (전체 현황, 정답률 분포, Top 3, 주의 필요 학생, 게임 종류·카테고리별 정답률)
argument-hint: "[대시보드 제목, 비우면 \"선생님 대시보드\"]"
---
<!-- Created: 2026-09-28 18:36 -->

`teacher/class.json`(`/teacher-collect`로 만든 반 기록)으로 브라우저에서 바로 여는 대시보드 HTML 한 장을 만듭니다. 입력: $ARGUMENTS

* 입력은 대시보드 제목이고 선택입니다. 비우면 `선생님 대시보드`입니다.
* 스크립트는 `Study-03-basic` 폴더에서 Node로 실행합니다. 셸 heredoc은 `\\`를 바꿀 수 있으므로 Write 도구로 임시 파일(scratchpad)에 저장해 실행합니다. 대문자 상수 `TITLE`은 입력 값으로 채웁니다 (JS 문자열로 이스케이프).
* 결과는 `teacher/reports/dashboard-날짜-시각.html`에 새로 만들고 이전 파일은 지우지 않습니다. 학생 이름이 들어 있으므로 `teacher/`가 저장소 루트 `.gitignore`에 있어야 하고, 공개된 곳에 올리지 않습니다. 커밋은 하지 않습니다.
* 표로 자세히 보는 `/teacher-report`와 달리, 한 화면에 반 상황을 카드로 요약하는 용도입니다.
* 만든 대시보드를 CSV(학생별 성적 표)나 인쇄용 PDF로 저장하려면 `/export-report`를 실행합니다 (파일을 안 주면 가장 최근 HTML, 즉 방금 만든 대시보드를 읽음).

## 대시보드 내용

한 파일에 CSS와 짧은 인쇄용 스크립트를 모두 담고(외부 파일·CDN 없음), 보라색 그라데이션 헤더와 3열 카드 격자로 구성합니다. 헤더의 **🖨️ PDF로 저장** 버튼(또는 `Ctrl+P`)은 브라우저 인쇄 창을 열고, 대상을 "PDF로 저장"으로 고르면 A4 가로·라이트 테마·카드 3열로 저장됩니다 (버튼은 인쇄물에 나오지 않고, 기본 파일 이름은 제목과 날짜). 시스템 다크 모드를 따르고, 좁은 화면에서는 카드가 한 줄씩 쌓이며 표는 가로로 스크롤됩니다.

1. **📋 전체 현황**: 학생 수, 평균 정답률, 최고·최저 정답률과 학생 이름, 목표 달성률(정답률 `GOAL`(70%) 이상인 학생 비율)
2. **📈 정답률 분포**: 90~100 / 80~89 / 70~79 / 60~69 / 50~59 / 50% 미만 구간별 학생 수 막대 (막대에 마우스를 올리면 학생 이름)
3. **🏆 성적 Top 3**: 정답률 순위 3위까지 (같으면 같은 순위), 푼 문제, 최장 연속, 마지막 플레이 날짜
4. **⚠️ 주의 필요 학생**: 📈을 뺀 표시가 있는 학생과 표시, 반 평균과 차이, 추이, 마지막 플레이
5. **🎮 게임 종류별 정답률**: 전체 도전, 카테고리 도전, 스피드 퀴즈마다 정답률, 판 수, 학생 수 (기록에 반 정보가 없어 반별 평균 대신)
6. **📚 카테고리별 정답률**: 모든 기록의 `categoryStats`를 합친 정답률 순
7. **👥 학생별 성적**: `/teacher-overview`와 같은 열의 표와 기준 설명

## 기준

`/teacher-overview`의 기본값(모든 게임, 전체 기간)과 같습니다. 순위와 평균·분포·목표 달성률은 `MIN_ANSWERED`(20문제) 이상 푼 학생의 정답률로 계산합니다 (그런 학생이 없으면 모든 학생). 표시는 `🔻` 반 평균보다 `LOW_GAP`(15%p) 이상 낮음, `📉`/`📈` 뒤쪽 절반 판 정답률이 `TREND_GAP`(5%p) 이상 낮음/높음(4판 이상), `💤` `IDLE_DAYS`(7일) 이상 쉼, `🔸` 푼 문제가 `MIN_ANSWERED` 미만. 색은 정답률 80% 이상 초록, 65~79% 노랑, 65% 미만 빨강입니다.

## 스크립트

```js
const fs = require('fs'), vm = require('vm'), path = require('path');
const TITLE = '선생님 대시보드';
const CLASS = 'teacher/class.json', OUT_DIR = path.join('teacher', 'reports');
const LOW_GAP = 15, TREND_GAP = 5, IDLE_DAYS = 7, MIN_ANSWERED = 20, GOAL = 70;
const fail = m => { console.log('실패: ' + m); process.exit(1); };
if (!fs.readFileSync('../.gitignore', 'utf8').split(/\r?\n/).some(l => /^\/?(Study-03-basic\/)?teacher\/?$/.test(l.trim()))) fail('.gitignore에 Study-03-basic/teacher/가 없음 (학생 이름이 저장소에 올라갈 수 있음)');
const html = fs.readFileSync('index.html', 'utf8');
const src = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('class LocalDataManager'));
const ctx = { module: { exports: {} } }; vm.createContext(ctx);
vm.runInContext(src, ctx);
const R = ctx.module.exports;
if (!fs.existsSync(CLASS)) fail(`${CLASS}가 없음. 먼저 /teacher-collect로 학생 기록을 모으세요.`);
const list = JSON.parse(fs.readFileSync(CLASS, 'utf8')).records;
if (!list.length) fail('반 기록이 비어 있음');

const DAY = 864e5, now = Date.now();
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const pct = (c, t) => (t ? Math.round(c / t * 100) : 0);
const accOf = a => pct(sum(a, x => x.correctAnswers), sum(a, x => x.totalQuestions));
const day = t => new Date(t).toLocaleDateString('ko-KR');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 학생별 통계 (/teacher-overview와 같은 계산)
const rows = R.getPlayerNames(list).map(name => {
  const mine = list.filter(h => h.name === name);
  const s = R.getPlayerStats(mine), half = Math.floor(mine.length / 2), best = R.getPersonalBest(mine, name, 'full', 'all');
  const last = mine[mine.length - 1].timestamp;
  return {
    name, plays: s.plays, early: mine.filter(h => h.endedEarly).length, answered: s.answered, accuracy: s.accuracy,
    avgTime: Math.round(sum(mine, h => (h.averageResponseTime || 0) * h.totalQuestions) / s.answered * 10) / 10,
    hints: Math.round(sum(mine, h => h.hintsUsed || 0) / s.plays * 10) / 10, streak: s.longestStreak,
    fullBest: best ? best.totalScore : null, trend: mine.length >= 4 ? accOf(mine.slice(-half)) - accOf(mine.slice(0, half)) : null,
    idle: Math.floor((now - new Date(last)) / DAY), last
  };
});
const enough = rows.filter(r => r.answered >= MIN_ANSWERED), pool = enough.length ? enough : rows;
const base = pool.map(r => r.accuracy).sort((a, b) => a - b);
const mean = Math.round(sum(base, x => x) / base.length);
// 20문제 이상 푼 학생이 없으면 모든 학생으로 순위를 매김 (Top 3·최고·최저가 비지 않게)
const ranked = [...pool].sort((a, b) => b.accuracy - a.accuracy || b.answered - a.answered);
ranked.forEach((r, i) => { r.rank = i && ranked[i - 1].accuracy === r.accuracy ? ranked[i - 1].rank : i + 1; });
const order = [...ranked, ...rows.filter(r => !pool.includes(r)).sort((a, b) => b.accuracy - a.accuracy)];
const flags = r => [r.answered < MIN_ANSWERED && '🔸표본 적음', r.answered >= MIN_ANSWERED && r.accuracy <= mean - LOW_GAP && '🔻평균보다 낮음',
  r.trend !== null && r.trend <= -TREND_GAP && '📉하락', r.trend !== null && r.trend >= TREND_GAP && '📈상승', r.idle >= IDLE_DAYS && `💤${r.idle}일 쉼`].filter(Boolean);
const signed = n => (n === null ? '-' : (n > 0 ? '+' : '') + n + '%p');
const top = ranked[0], bottom = ranked[ranked.length - 1];
const goalHit = pool.filter(r => r.accuracy >= GOAL).length;

// 정답률 분포
const BINS = [['90~100%', 90, 101, 'b1'], ['80~89%', 80, 90, 'b2'], ['70~79%', 70, 80, 'b3'], ['60~69%', 60, 70, 'b4'], ['50~59%', 50, 60, 'b5'], ['50% 미만', 0, 50, 'b6']];
const bins = BINS.map(([label, lo, hi, cls]) => ({ label, cls, names: pool.filter(r => r.accuracy >= lo && r.accuracy < hi).map(r => r.name) }));
const maxBin = Math.max(1, ...bins.map(b => b.names.length));

// 게임 종류별, 카테고리별 정답률
const MODES = [['full', '🏆 전체 도전'], ['category', '📚 카테고리 도전'], ['speed', '⚡ 스피드 퀴즈']];
const modes = MODES.map(([k, label]) => { const a = list.filter(h => h.mode === k); return { label, plays: a.length, players: new Set(a.map(h => h.name)).size, acc: accOf(a) }; }).filter(m => m.plays);
const cats = {};
list.forEach(h => Object.entries(h.categoryStats || {}).forEach(([c, s]) => { const t = cats[c] || (cats[c] = { correct: 0, total: 0 }); t.correct += s.correct; t.total += s.total; }));
const catRows = Object.entries(cats).map(([c, s]) => ({ c, acc: pct(s.correct, s.total), total: s.total })).sort((a, b) => b.acc - a.acc);

const watch = order.filter(r => flags(r).some(f => !f.startsWith('📈')));
const pad = n => String(n).padStart(2, '0'), d = new Date();
const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const file = path.join(OUT_DIR, `dashboard-${stamp.slice(0, 10).replace(/-/g, '')}-${stamp.slice(11).replace(':', '')}${pad(d.getSeconds())}.html`);
const tone = n => (n >= 80 ? 'good' : n >= 65 ? 'mid' : 'bad');
const diffCls = n => (n === null || n === 0 ? '' : n > 0 ? 'up' : 'down');

const page = `<!doctype html>
<!-- Created: ${stamp} -->
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TITLE)}</title>
<style>
:root { --bg:#f3f2fa; --card:#ffffff; --inner:#f1f0f8; --line:#e2e0ee; --text:#1f1d2e; --muted:#6c6a80; --title:#5b4bc4; --num:#0e8fa8;
  --good:#16a36a; --mid:#c98a06; --bad:#d64545; --good-bg:#e5f6ee; --good-line:#b5e3cc; --bad-bg:#fbf1e3; --bad-line:#efd3a8;
  --b1:#22b35e; --b2:#3b7cf0; --b3:#8a5cf0; --b4:#f0a00c; --b5:#f07212; --b6:#e6423f; --track:#e7e5f2; --shadow:0 4px 18px rgba(60,50,120,.08); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#1b1b2b; --card:#2a2a3d; --inner:#34344a; --line:#3d3d55; --text:#ecebf5; --muted:#a7a6bd; --title:#aab4ff; --num:#5fe0f0;
  --good:#3ddc97; --mid:#f5c04a; --bad:#ff7b72; --good-bg:#23483f; --good-line:#2f6a58; --bad-bg:#4a3c30; --bad-line:#6d5638; --track:#3a3a52; --shadow:0 6px 24px rgba(0,0,0,.35); } }
:root[data-theme="dark"] { --bg:#1b1b2b; --card:#2a2a3d; --inner:#34344a; --line:#3d3d55; --text:#ecebf5; --muted:#a7a6bd; --title:#aab4ff; --num:#5fe0f0;
  --good:#3ddc97; --mid:#f5c04a; --bad:#ff7b72; --good-bg:#23483f; --good-line:#2f6a58; --bad-bg:#4a3c30; --bad-line:#6d5638; --track:#3a3a52; --shadow:0 6px 24px rgba(0,0,0,.35); }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text); font-family:system-ui, "Malgun Gothic", sans-serif; line-height:1.5; }
main { max-width:1120px; margin:0 auto; padding:24px 16px 48px; }
header { background:linear-gradient(120deg, #6a82e8, #7b4fb5); color:#fff; border-radius:16px; padding:28px 16px; text-align:center; box-shadow:0 8px 30px rgba(106,90,220,.35); }
header h1 { margin:0; font-size:2rem; } header p { margin:6px 0 0; opacity:.9; font-size:.95rem; }
.grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:20px; margin-top:24px; }
@media (max-width:900px) { .grid { grid-template-columns:1fr; } }
.card { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:22px; box-shadow:var(--shadow); min-width:0; }
.card.wide { grid-column:1 / -1; }
.card h2 { margin:0 0 18px; font-size:1.1rem; color:var(--title); }
.stats { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.stat { background:var(--inner); border:1px solid transparent; border-radius:12px; padding:14px 8px; text-align:center; }
.stat strong { display:block; font-size:1.7rem; color:var(--num); font-variant-numeric:tabular-nums; }
.stat span { font-size:.85rem; color:var(--muted); }
.stat.hi { background:var(--good-bg); border-color:var(--good-line); } .stat.lo { background:var(--bad-bg); border-color:var(--bad-line); }
.stat.full { grid-column:1 / -1; }
.chart { display:flex; align-items:flex-end; gap:6px; height:170px; padding-top:8px; }
.col { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; min-width:0; }
.col .bar { width:100%; border-radius:8px 8px 4px 4px; color:#fff; font-weight:700; font-size:.85rem; display:flex; align-items:flex-end; justify-content:center; padding-bottom:6px; min-height:4px; }
.col .bar.zero { background:var(--track) !important; padding:0; }
.col small { font-size:.72rem; color:var(--muted); margin-top:6px; text-align:center; word-break:keep-all; }
.b1 { background:var(--b1); } .b2 { background:var(--b2); } .b3 { background:var(--b3); } .b4 { background:var(--b4); } .b5 { background:var(--b5); } .b6 { background:var(--b6); }
.note { color:var(--muted); font-size:.8rem; margin:14px 0 0; }
.list { display:flex; flex-direction:column; gap:12px; margin:0; padding:0; list-style:none; }
.item { background:var(--inner); border-radius:12px; padding:12px 14px; display:flex; align-items:center; gap:12px; }
.medal { width:32px; height:32px; flex:none; border-radius:50%; display:grid; place-items:center; font-weight:700; color:#fff; background:#8e90a6; }
.medal.r1 { background:#f5b50a; } .medal.r3 { background:#c07a3e; }
.who { flex:1; min-width:0; } .who b { display:block; } .who small { color:var(--muted); font-size:.8rem; }
.score { font-weight:700; font-size:1.15rem; color:var(--good); font-variant-numeric:tabular-nums; }
.good { color:var(--good); } .mid { color:var(--mid); } .bad { color:var(--bad); }
.warn { border-left:4px solid var(--bad); }
.tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
.tag { font-size:.75rem; background:var(--card); border-radius:999px; padding:1px 8px; }
.hbar { margin-bottom:14px; } .hbar:last-child { margin-bottom:0; }
.hbar .top { display:flex; justify-content:space-between; font-size:.9rem; margin-bottom:6px; } .hbar .top small { color:var(--muted); }
.track { height:10px; background:var(--track); border-radius:5px; overflow:hidden; } .track i { display:block; height:100%; border-radius:5px; }
.fill-good { background:var(--good); } .fill-mid { background:var(--mid); } .fill-bad { background:var(--bad); }
.scroll { overflow-x:auto; }
table { border-collapse:collapse; width:100%; min-width:960px; font-size:.9rem; }
th, td { padding:10px; text-align:left; border-bottom:1px solid var(--line); white-space:nowrap; }
thead th { color:var(--muted); font-size:.8rem; font-weight:600; }
tbody tr:last-child > * { border-bottom:0; }
.num { text-align:right; font-variant-numeric:tabular-nums; } .up { color:var(--good); } .down { color:var(--bad); }
td small { color:var(--muted); }
td.flags { white-space:normal; min-width:130px; }
.who small { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
header { position:relative; }
.print-btn { position:absolute; top:16px; right:16px; border:1px solid rgba(255,255,255,.55); background:rgba(255,255,255,.16); color:#fff; border-radius:999px; padding:6px 14px; font:inherit; font-size:.85rem; cursor:pointer; }
.print-btn:hover { background:rgba(255,255,255,.3); } .print-btn:focus-visible { outline:2px solid #fff; outline-offset:2px; }
@media (max-width:600px) { .print-btn { position:static; margin-top:14px; } }
@page { size:A4 landscape; margin:10mm; }
@media print { * { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .print-btn { display:none; }
  body { background:#fff; } main { padding:0; max-width:none; } header, .card { box-shadow:none; }
  .grid { grid-template-columns:repeat(3, 1fr); } .scroll { overflow:visible; } table { min-width:0; font-size:11px; }
  th, td { padding:6px; } thead th { white-space:normal; word-break:keep-all; } tr, .card, .stat, .item, .hbar { break-inside:avoid; } }
</style></head><body><main>
<header><h1>📊 ${esc(TITLE)}</h1><p>생성일시: ${stamp} · 기록 ${day(list[0].timestamp)} ~ ${day(list[list.length - 1].timestamp)}</p><button type="button" class="print-btn" title="인쇄 창에서 대상을 'PDF로 저장'으로 고르세요">🖨️ PDF로 저장</button></header>
<div class="grid">
<section class="card"><h2>📋 전체 현황</h2><div class="stats">
  <div class="stat"><strong>${rows.length}명</strong><span>총 학생 수</span></div>
  <div class="stat"><strong>${mean}%</strong><span>평균 정답률</span></div>
  <div class="stat hi"><strong>${top.accuracy}%</strong><span>최고 (${esc(ranked.filter(r => r.rank === 1).map(r => r.name).join(', '))})</span></div>
  <div class="stat lo"><strong>${bottom.accuracy}%</strong><span>최저 (${esc(ranked.filter(r => r.accuracy === bottom.accuracy).map(r => r.name).join(', '))})</span></div>
  <div class="stat full"><strong>${pct(goalHit, pool.length)}%</strong><span>목표 달성률 (정답률 ${GOAL}% 이상: ${goalHit}/${pool.length}명)</span></div>
</div></section>
<section class="card"><h2>📈 정답률 분포</h2><div class="chart">
${bins.map(b => `  <div class="col" title="${esc(b.names.join(', ') || '없음')}"><div class="bar ${b.cls}${b.names.length ? '' : ' zero'}" style="height:${b.names.length ? Math.max(18, b.names.length / maxBin * 100) : 3}%">${b.names.length || ''}</div><small>${b.label}</small></div>`).join('\n')}
</div><p class="note">막대 위에 마우스를 올리면 학생 이름이 보입니다. 기록 ${list.length}판, 푼 문제 ${sum(rows, r => r.answered)}개 기준.</p></section>
<section class="card"><h2>🏆 성적 Top 3</h2><ol class="list">
${ranked.filter(r => r.rank <= 3).map(r => `  <li class="item"><span class="medal r${r.rank}">${r.rank}</span><span class="who"><b>${esc(r.name)}</b><small>${r.answered}문제 · 최장 연속 ${r.streak} · ${new Date(r.last).getMonth() + 1}/${new Date(r.last).getDate()}</small></span><span class="score">${r.accuracy}%</span></li>`).join('\n')}
</ol></section>
<section class="card"><h2>⚠️ 주의 필요 학생</h2>${watch.length ? `<ul class="list">
${watch.map(r => `  <li class="item warn"><span class="who"><b>${esc(r.name)} <span class="${tone(r.accuracy)}">${r.accuracy}%</span></b><span class="tags">${flags(r).filter(f => !f.startsWith('📈')).map(f => `<span class="tag">${esc(f)}</span>`).join('')}</span><small>반 평균과 ${signed(r.accuracy - mean)} · 추이 ${signed(r.trend)} · 마지막 ${r.idle ? r.idle + '일 전' : '오늘'}</small></span></li>`).join('\n')}
</ul>` : '<p class="note">없음</p>'}</section>
<section class="card"><h2>🎮 게임 종류별 정답률</h2>
${modes.map(m => `  <div class="hbar"><div class="top"><span>${m.label}</span><span><b class="${tone(m.acc)}">${m.acc}%</b> <small>${m.plays}판 · ${m.players}명</small></span></div><div class="track"><i class="fill-${tone(m.acc)}" style="width:${m.acc}%"></i></div></div>`).join('\n')}
<p class="note">반 구분이 없어 반별 평균 대신 게임 종류별로 나눴습니다.</p></section>
<section class="card"><h2>📚 카테고리별 정답률</h2>
${catRows.map(c => `  <div class="hbar"><div class="top"><span>${esc(c.c)}</span><span><b class="${tone(c.acc)}">${c.acc}%</b> <small>${c.total}문제</small></span></div><div class="track"><i class="fill-${tone(c.acc)}" style="width:${c.acc}%"></i></div></div>`).join('\n')}
</section>
<section class="card wide"><h2>👥 학생별 성적</h2><div class="scroll"><table>
<thead><tr><th class="num">순위</th><th>이름</th><th class="num">정답률</th><th class="num">반 평균과 차이</th><th class="num">푼 문제</th><th class="num">판 수(중간 종료)</th><th class="num">평균 응답</th><th class="num">판당 힌트</th><th class="num">최장 연속</th><th class="num">전체 도전 최고</th><th class="num">추이</th><th>마지막 플레이</th><th>표시</th></tr></thead>
<tbody>
${order.map(r => `<tr><td class="num">${r.rank || '-'}</td><th scope="row">${esc(r.name)}</th><td class="num ${tone(r.accuracy)}"><b>${r.accuracy}%</b></td><td class="num ${diffCls(r.accuracy - mean)}">${signed(r.accuracy - mean)}</td><td class="num">${r.answered}</td><td class="num">${r.plays} <small>(${r.early})</small></td><td class="num">${r.avgTime}초</td><td class="num">${r.hints}</td><td class="num">${r.streak}</td><td class="num">${r.fullBest ?? '-'}</td><td class="num ${diffCls(r.trend)}">${signed(r.trend)}</td><td>${r.idle ? r.idle + '일 전' : '오늘'}</td><td class="flags">${flags(r).map(esc).join(" ") || "-"}</td></tr>`).join('\n')}
</tbody></table></div>
<p class="note">평균·분포·목표 달성률은 ${MIN_ANSWERED}문제 이상 푼 학생 기준. 🔻 반 평균보다 ${LOW_GAP}%p 이상 낮음 · 📉/📈 뒤쪽 절반 판 정답률이 ${TREND_GAP}%p 이상 낮음/높음(4판 이상) · 💤 ${IDLE_DAYS}일 이상 쉼 · 🔸 ${MIN_ANSWERED}문제 미만. 전체 도전 최고는 전체 도전 · 전체 난이도에서 끝까지 푼 게임의 최고 점수.</p></section>
</div></main>
<script>
// 인쇄(PDF 저장)할 때는 라이트 테마로, 파일 이름은 제목과 날짜로
(() => {
  const root = document.documentElement, title = document.title;
  let theme = null;
  addEventListener('beforeprint', () => { theme = root.getAttribute('data-theme'); root.setAttribute('data-theme', 'light'); document.title = title + ' ' + '${stamp.slice(0, 10)}'; });
  addEventListener('afterprint', () => { if (theme === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme); document.title = title; });
  document.querySelector('.print-btn').addEventListener('click', () => print());
})();
</script>
</body></html>
`;
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(file, page);
console.log(`[저장] ${file} (${Math.round(fs.statSync(file).size / 1024)}KB)`);
console.log('  file:///' + path.resolve(file).replace(/\\/g, '/'));
console.log(`[요약] 학생 ${rows.length}명, 기록 ${list.length}판, 평균 정답률 ${mean}%, 최고 ${top.accuracy}%(${top.name}), 최저 ${bottom.accuracy}%(${bottom.name}), 목표 달성 ${goalHit}/${pool.length}명`);
console.log('[분포] ' + bins.map(b => `${b.label} ${b.names.length}명`).join(', '));
console.log('[Top 3] ' + ranked.filter(r => r.rank <= 3).map(r => `${r.rank}위 ${r.name} ${r.accuracy}%`).join(', '));
console.log('[게임 종류] ' + modes.map(m => `${m.label} ${m.acc}%`).join(', '));
console.log('[카테고리] ' + catRows.map(c => `${c.c} ${c.acc}%`).join(', '));
console.log('[주의 필요] ' + (watch.map(r => `${r.name}(${flags(r).filter(f => !f.startsWith('📈')).join(', ')})`).join(', ') || '없음'));
console.log('대시보드 완료');
```

**통과 조건**: `대시보드 완료`가 출력됨. `실패:`가 나오면 그 줄을 그대로 보고하고, 만들다 만 대시보드 파일이 있으면 지운 뒤 멈춥니다.

**보고**: 대시보드 경로와 크기, 여는 방법(파일을 더블클릭하거나 출력된 `file:///` 주소를 브라우저에 붙여 넣기)을 적고, 출력된 요약·분포·Top 3·게임 종류·카테고리·주의 필요 학생을 몇 줄로 정리합니다. 다른 사람에게 보낼 때는 학생 이름이 들어 있다는 점을 알립니다. 학생별 자세한 비교는 `/teacher-compare`, 카테고리 약점은 `/teacher-weak`, CSV·PDF 저장은 `/export-report`(예: `/export-report pdf`)를 안내합니다.

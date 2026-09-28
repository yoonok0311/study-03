---
description: 선생님 모드 - HTML 리포트·대시보드(teacher/reports)를 CSV(표)나 PDF(인쇄용)로 저장
argument-hint: "[csv | pdf | 둘 다(기본)] [HTML 파일 경로, 비우면 teacher/reports의 가장 최근 HTML]"
---
<!-- Created: 2026-09-28 18:53 -->

`/teacher-report`, `/teacher-dashboard`가 `teacher/reports/`에 만든 HTML 파일을 읽어 CSV나 PDF로 저장합니다. 입력: $ARGUMENTS

* 입력은 형식과 HTML 파일이고 둘 다 선택입니다. 순서는 상관없습니다. 알 수 없는 값이면 사용법(`/export-report [csv | pdf | 둘 다] [HTML 파일]`)을 보여 주고 멈춥니다.
  * 형식(`FORMAT`): `csv`/`CSV` → `csv`, `pdf`/`PDF` → `pdf`, 비우거나 `둘 다`/`전체`/`all` → `all`
  * HTML 파일(`INPUT`): `.html`로 끝나는 경로. 이름만 주면 `teacher/reports/`에서 찾습니다. 비우면 `teacher/reports/`에서 가장 최근에 수정된 HTML을 읽습니다 (`''`).
* 스크립트는 `Study-03-basic` 폴더에서 Node로 실행합니다. 셸 heredoc은 `\\`를 바꿀 수 있으므로 Write 도구로 임시 파일(scratchpad)에 저장해 실행합니다. 대문자 상수 `FORMAT`, `INPUT`은 입력 값으로 채웁니다 (JS 문자열로 이스케이프).
* 결과는 입력 HTML이 어디 있든 `teacher/reports/`에 `원본이름-표제목.csv`, `원본이름.pdf`로 저장합니다. 같은 이름이 있으면 덮어씁니다. 원본 HTML은 고치지 않습니다. 학생 이름이 들어 있으므로 `teacher/`가 저장소 루트 `.gitignore`에 있어야 하고, 커밋하지 않습니다.

## 내보내는 내용

* **CSV**: HTML의 `<table>`마다 파일 하나. 파일 이름의 표제목은 표 바로 앞 `<h2>` 제목입니다 (예: `학생별_성적`, `카테고리별_정답률`). 셀은 화면에 보이는 글자 그대로이고(`85%`, `3.8초`), 추이선 SVG는 `aria-label`의 숫자로 바꿉니다. 엑셀에서 한글이 깨지지 않게 UTF-8 BOM과 CRLF를 쓰고, `=`·`@` 등으로 시작하는 셀은 따옴표로 감싸 수식으로 실행되지 않게 합니다. 대시보드의 카드(전체 현황, 분포 등)는 표가 아니라서 CSV에 들어가지 않고 PDF에 들어갑니다.
* **PDF**: Edge(없으면 Chrome)를 헤드리스로 실행해 인쇄합니다. 원본을 임시 폴더에 복사해 인쇄용 스타일을 덧붙입니다. 적용되는 스타일은 A4 가로, 라이트 테마, 배경색 포함, 대시보드 카드 3열 유지, 넓은 표를 한 쪽 너비에 맞춤, 카드와 표 줄이 쪽 사이에서 잘리지 않음입니다. 머리글·바닥글(날짜, 파일 경로)은 넣지 않습니다.

## 스크립트

```js
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const FORMAT = 'all';  // csv | pdf | all
const INPUT = '';      // '' teacher/reports의 가장 최근 HTML | 파일 경로
const OUT_DIR = path.join('teacher', 'reports');
const BROWSERS = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'];
const fail = m => { console.log('실패: ' + m); process.exit(1); };
if (!['csv', 'pdf', 'all'].includes(FORMAT)) fail(`형식은 csv, pdf, all 중 하나 (받은 값: ${FORMAT})`);
if (!fs.readFileSync('../.gitignore', 'utf8').split(/\r?\n/).some(l => /^\/?(Study-03-basic\/)?teacher\/?$/.test(l.trim()))) fail('.gitignore에 Study-03-basic/teacher/가 없음 (학생 이름이 저장소에 올라갈 수 있음)');

let src = INPUT;
if (src && !fs.existsSync(src) && path.basename(src) === src) src = path.join(OUT_DIR, src);
if (!src) {
  const htmls = fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.html')) : [];
  if (!htmls.length) fail(`${OUT_DIR}에 HTML이 없음. 먼저 /teacher-report나 /teacher-dashboard로 만드세요.`);
  src = path.join(OUT_DIR, htmls.sort((a, b) => fs.statSync(path.join(OUT_DIR, b)).mtimeMs - fs.statSync(path.join(OUT_DIR, a)).mtimeMs)[0]);
}
if (!fs.existsSync(src) || !/\.html?$/i.test(src)) fail(`HTML 파일이 없음: ${src}`);
const html = fs.readFileSync(src, 'utf8');
const base = path.join(OUT_DIR, path.basename(src).replace(/\.html?$/i, ''));
console.log(`[입력] ${src} (${Math.round(fs.statSync(src).size / 1024)}KB)`);
const made = [];

// ----- CSV: 표마다 파일 하나 (엑셀에서 한글이 깨지지 않게 UTF-8 BOM) -----
if (FORMAT !== 'pdf') {
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
  const text = h => h.replace(/<svg\b[^>]*aria-label="([^"]*)"[\s\S]*?<\/svg>/g, ' $1 ').replace(/<svg\b[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, ' ').replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ENT[e]).replace(/\s+/g, ' ').trim();
  const cell = v => (/[",\r\n]/.test(v) || /^[=+\-@]/.test(v) && !/^[+-]?\d/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const tables = [...html.matchAll(/<table\b[\s\S]*?<\/table>/g)];
  if (!tables.length) console.log('[CSV] 이 HTML에는 표가 없음');
  const used = new Set();
  tables.forEach((t, i) => {
    const before = html.slice(0, t.index), h2 = [...before.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].pop();
    let name = (h2 ? text(h2[1]) : `표${i + 1}`).replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '') || `표${i + 1}`;
    while (used.has(name)) name += '_' + (i + 1);
    used.add(name);
    const rows = [...t[0].matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(r => [...r[0].matchAll(/<(t[hd])\b[^>]*>([\s\S]*?)<\/\1>/g)].map(c => cell(text(c[2]))));
    const file = `${base}-${name}.csv`;
    fs.writeFileSync(file, '\uFEFF' + rows.map(r => r.join(',')).join('\r\n') + '\r\n');
    made.push(file);
    console.log(`[CSV] ${file} (${rows.length - 1}줄 × ${rows[0] ? rows[0].length : 0}열)`);
  });
}

// ----- PDF: Edge·Chrome 헤드리스 인쇄 (A4 가로, 라이트 테마, 배경색 포함, 넓은 표는 줄바꿈) -----
if (FORMAT !== 'csv') {
  const browser = BROWSERS.find(b => fs.existsSync(b));
  if (!browser) fail('PDF를 만들 Edge나 Chrome을 찾지 못함');
  const PRINT = `<style>@page { size: A4 landscape; margin: 10mm; }
@media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { background: #fff; } main { padding-bottom: 0 !important; } header, .card { box-shadow: none !important; }
  .grid { grid-template-columns: repeat(3, 1fr) !important; } .card.wide { grid-column: 1 / -1; }
  .scroll { overflow: visible !important; } table { min-width: 0 !important; width: 100%; font-size: 11px !important; }
  th, td { padding: 6px !important; } thead th { white-space: normal !important; word-break: keep-all; }
  tr, .card, .tile, .stat, .item, .hbar { break-inside: avoid; } }</style>`;
  const tmp = path.join(os.tmpdir(), `export-report-${process.pid}.html`);
  fs.writeFileSync(tmp, html.replace(/<html\b/, '<html data-theme="light"').replace('</head>', PRINT + '</head>'));
  const file = base + '.pdf';
  const r = spawnSync(browser, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--blink-settings=preferredColorScheme=1',
    '--virtual-time-budget=3000', `--print-to-pdf=${path.resolve(file)}`, 'file:///' + tmp.replace(/\\/g, '/')], { timeout: 60000 });
  fs.rmSync(tmp, { force: true });
  if (r.error || !fs.existsSync(file) || fs.statSync(file).size < 1000) fail(`PDF를 만들지 못함 (${r.error ? r.error.message : '출력 파일 없음'})`);
  made.push(file);
  const pages = (fs.readFileSync(file, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`[PDF] ${file} (${Math.round(fs.statSync(file).size / 1024)}KB, ${pages}쪽, ${path.basename(browser)})`);
}
made.forEach(f => console.log('  file:///' + path.resolve(f).replace(/\\/g, '/')));
console.log('내보내기 완료');
```

**통과 조건**: `내보내기 완료`가 출력됨. `실패:`가 나오면 그 줄을 그대로 보고하고 멈춥니다. PDF가 0쪽이거나 1KB보다 작으면 실패로 봅니다.

**보고**: 입력 HTML과 만든 파일마다 경로·크기(CSV는 줄 × 열, PDF는 쪽 수)를 적고, 여는 방법을 안내합니다. CSV는 엑셀에서 더블클릭, PDF는 브라우저나 PDF 뷰어로 열거나 출력된 `file:///` 주소를 붙여 넣습니다. 다른 사람에게 보낼 때는 학생 이름이 들어 있다는 점을 알립니다.

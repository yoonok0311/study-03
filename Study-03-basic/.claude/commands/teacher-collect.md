---
description: 선생님 모드 - 학생들이 보낸 기록 파일을 검사하고 반 기록 하나로 합치기
argument-hint: "[폴더 또는 .json 파일 경로 여러 개, 비우면 teacher/inbox]"
---
<!-- Created: 2026-09-28 18:06 -->

학생들이 각자 브라우저에서 내보낸 게임 기록 파일을 검사해 반 전체 기록 `teacher/class.json` 하나로 합칩니다. 다른 선생님 모드 명령어(`/teacher-overview`, `/teacher-compare`, `/teacher-weak`, `/teacher-report`)는 모두 이 파일을 읽습니다. 입력: $ARGUMENTS

* 입력은 폴더나 `.json` 파일 경로이고, 공백으로 나눠 여러 개를 받습니다. 폴더는 그 안의 `.json` 파일을 모두 읽습니다 (하위 폴더는 읽지 않음). 비우면 `teacher/inbox`입니다.
* 스크립트는 `Study-03-basic` 폴더에서 Node로 실행합니다. 셸 heredoc은 `\\`를 바꿀 수 있으므로 Write 도구로 임시 파일(scratchpad)에 저장해 실행합니다. 대문자 상수 `SOURCES`는 입력 값으로 채웁니다.
* `teacher/`는 학생 이름이 들어 있으므로 저장소 루트 `.gitignore`에 들어 있어야 합니다 (없으면 `# 선생님 모드 학생 기록 (학생 이름 포함)` 주석과 함께 `Study-03-basic/teacher/`를 먼저 추가).
* `teacher/class.json`은 매번 새로 만듭니다 (원본 파일은 건드리지 않음). 커밋은 하지 않습니다.

## 학생 기록 받기 (학생에게 안내할 내용)

게임 기록은 학생 브라우저의 `localStorage`에만 있어서, 학생마다 파일로 내보내 선생님에게 보내야 합니다.

1. 게임을 한 브라우저에서 퀴즈 사이트를 엽니다 (배포 사이트와 내려받은 파일은 기록이 따로 저장되므로 게임을 한 쪽).
2. `F12` → Console 탭에서 `copy(localStorage.getItem('quizBasic.history'))`를 실행하면 기록이 클립보드에 복사됩니다.
3. 메모장에 붙여 넣고 `quiz-history-이름.json`으로 저장해 선생님에게 보냅니다.

선생님은 받은 파일을 `Study-03-basic/teacher/inbox/`에 모읍니다. 한 컴퓨터를 여러 학생이 썼다면 그 파일에 여러 학생의 기록이 들어 있어도 됩니다 (기록마다 이름이 있음). 같은 파일을 두 번 받아도 중복은 한 번만 셉니다.

## 스크립트

```js
const fs = require('fs'), path = require('path');
const SOURCES = ['teacher/inbox'];  // 폴더 또는 .json 파일
const OUT = path.join('teacher', 'class.json');
const MODES = ['full', 'category', 'speed'], LEVELS = ['all', 'easy', 'hard'];
const fail = m => { console.log('실패: ' + m); process.exit(1); };
if (!fs.readFileSync('../.gitignore', 'utf8').split(/\r?\n/).some(l => /^\/?(Study-03-basic\/)?teacher\/?$/.test(l.trim()))) fail('.gitignore에 Study-03-basic/teacher/가 없음 (학생 이름이 저장소에 올라갈 수 있음)');

const files = [];
SOURCES.forEach(s => {
  if (!fs.existsSync(s)) fail(`경로가 없음: ${s}${s === 'teacher/inbox' ? ' (학생 기록 파일을 teacher/inbox/에 넣거나, /teacher-sample로 연습용 파일을 만드세요)' : ''}`);
  if (fs.statSync(s).isDirectory()) files.push(...fs.readdirSync(s).filter(f => f.toLowerCase().endsWith('.json')).sort().map(f => path.join(s, f)));
  else files.push(s);
});
const list = [...new Set(files.map(f => path.resolve(f)))].filter(f => f !== path.resolve(OUT));
if (!list.length) fail(`${SOURCES.join(', ')}에 .json 기록 파일이 없음`);

const norm = s => String(s).normalize('NFC').trim().replace(/\s+/g, ' ');
const why = r => {
  if (!r || typeof r !== 'object') return '기록이 객체가 아님';
  if (typeof r.name !== 'string' || !norm(r.name)) return '이름 없음';
  if (!MODES.includes(r.mode)) return '알 수 없는 모드';
  if (r.level !== undefined && !LEVELS.includes(r.level)) return '알 수 없는 난이도';
  if (typeof r.totalScore !== 'number') return '점수 없음';
  if (!Number.isInteger(r.totalQuestions) || r.totalQuestions < 1) return '푼 문제 수 오류';
  if (!Number.isInteger(r.correctAnswers) || r.correctAnswers < 0 || r.correctAnswers > r.totalQuestions) return '정답 수 오류';
  if (isNaN(new Date(r.timestamp))) return '시각 오류';
  return '';
};
const seen = new Map(), sources = [], renamed = {}, bad = {};
list.forEach(f => {
  const rel = path.relative('.', f).replace(/\\/g, '/'), info = { file: rel, records: 0, added: 0, duplicates: 0, invalid: 0 };
  sources.push(info);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '').trim());
    if (typeof data === 'string') data = JSON.parse(data);  // 문자열로 한 번 더 감싼 경우
    if (data && Array.isArray(data.records)) data = data.records;  // 다른 반 class.json
  } catch (e) { info.error = 'JSON이 아님: ' + e.message; return; }
  if (!Array.isArray(data)) { info.error = 'JSON 배열이 아님'; return; }
  data.forEach(r => {
    info.records++;
    const w = why(r);
    if (w) { info.invalid++; bad[w] = (bad[w] || 0) + 1; return; }
    const name = norm(r.name);
    if (name !== r.name) renamed[JSON.stringify(r.name)] = name;
    const rec = { ...r, name, level: r.level || 'all', category: r.category ?? null, endedEarly: !!r.endedEarly };
    const key = rec.id || `${name}|${rec.timestamp}`;
    if (seen.has(key)) { info.duplicates++; return; }
    seen.set(key, rec);
    info.added++;
  });
});
const records = [...seen.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
if (!records.length) fail('쓸 수 있는 기록이 하나도 없음');

const prev = fs.existsSync(OUT) ? (JSON.parse(fs.readFileSync(OUT, 'utf8')).records || []).length : null;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ collectedAt: new Date().toISOString(), sources, renamed, records }, null, 2) + '\n');
const back = JSON.parse(fs.readFileSync(OUT, 'utf8'));
if (back.records.length !== records.length) fail(`${OUT}를 다시 읽은 기록 수가 다름`);

console.log('[파일별]  파일 | 기록 | 추가 | 중복 | 형식 오류 | 문제');
sources.forEach(s => console.log(`  ${s.file} | ${s.records} | ${s.added} | ${s.duplicates} | ${s.invalid} | ${s.error || '-'}`));
if (Object.keys(bad).length) console.log('형식 오류 이유: ' + Object.entries(bad).map(([k, v]) => `${k} ${v}건`).join(', '));
if (Object.keys(renamed).length) console.log('이름 정리 (앞뒤·중복 공백): ' + Object.entries(renamed).map(([a, b]) => `${a} → "${b}"`).join(', '));
const names = [...new Set(records.map(r => r.name))].sort((a, b) => a.localeCompare(b, 'ko'));
const compact = n => n.replace(/\s/g, '').toLowerCase();
const similar = names.filter((n, i) => names.findIndex(m => compact(m) === compact(n)) !== i).map(n => names.filter(m => compact(m) === compact(n)).join(' / '));
if (similar.length) console.log('⚠️ 같은 학생일 수 있는 이름 (자동으로 합치지 않음): ' + [...new Set(similar)].join(', '));
const day = t => new Date(t).toLocaleDateString('ko-KR');
console.log('[학생별]  이름 | 판 수 | 중간 종료 | 첫 기록 | 마지막 기록');
names.forEach(n => {
  const mine = records.filter(r => r.name === n);
  console.log(`  ${n} | ${mine.length} | ${mine.filter(r => r.endedEarly).length} | ${day(mine[0].timestamp)} | ${day(mine[mine.length - 1].timestamp)}`);
});
if (sources.some(s => s.error)) console.log(`⚠️ 읽지 못한 파일 ${sources.filter(s => s.error).length}개는 빼고 합침`);
console.log(`수집 완료: ${OUT} (파일 ${sources.length}개, 학생 ${names.length}명, 기록 ${records.length}판, 중복 ${sources.reduce((a, s) => a + s.duplicates, 0)}판 뺌, 형식 오류 ${sources.reduce((a, s) => a + s.invalid, 0)}판 뺌${prev === null ? '' : `, 이전 class.json ${prev}판을 덮어씀`})`);
```

**통과 조건**: `수집 완료`가 출력됨. `실패:`가 나오면 그 줄을 그대로 보고하고 멈춥니다. 읽지 못한 파일이 있어도 나머지로 합치고 통과하지만, 보고에서 그 파일을 ⚠️로 알립니다.

**보고**: 한 줄 요약(파일, 학생, 기록 수) 뒤에 파일별 표와 학생별 표를 보여 줍니다. 형식 오류, 이름 정리, 같은 학생일 수 있는 이름이 있으면 따로 적고, 같은 학생이면 학생에게 이름을 통일해 다시 내보내게 하거나 원본 파일의 `name`을 고친 뒤 다시 실행하도록 안내합니다. 다음 명령으로 `/teacher-overview`를 안내합니다.

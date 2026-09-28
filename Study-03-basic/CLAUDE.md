# CLAUDE.md

이 파일은 이 폴더에서 코드를 다룰 때 Claude Code(claude.ai/code)가 참고할 지침입니다.

## 프로젝트 개요

"퀴즈 게임 - 지식의 도전"은 한국어 4지선다 상식 퀴즈 웹 게임입니다. 순수 HTML/CSS/JavaScript로 만들었고 빌드 단계, 의존성, 서버가 없습니다. 브라우저에서 `index.html`을 열면 바로 실행됩니다.

상위 폴더(`study-03/`)의 "상식 퀴즈"와는 별개의 버전입니다. 함께 있는 zip 파일은 이 폴더의 최초 원본이며 수정하지 않습니다. 공개 저장소에는 올리지 않고 로컬에만 보관합니다 (`.gitignore`의 `*.zip`).

## 구조

모든 코드가 `index.html` 파일 하나에 들어 있습니다. `<head>`에 저장된 테마를 먼저 적용하는 `<script id="theme-init">`와 CSS(`<style>`)가 있고, `<body>` 끝의 `<script>` 4개에 순서대로 문제 데이터, 점수 계산, 기록 저장과 순위, 게임 로직이 있습니다. 문제 데이터는 속성 없는 첫 번째 `<script>`여야 합니다 (`.claude/commands`의 검사 스크립트가 `/<script>([sS]*?)</script>/`로 찾음).

* 화면: 화면 5개(`#startScreen`, `#quizScreen`, `#resultScreen`, 순위표 `#leaderboardScreen`, 내 기록 `#statsScreen`)와 피드백 모달(`#feedbackModal`), 일시정지 화면(`#pauseOverlay`). `active` 클래스가 붙은 화면만 보이고, 모달은 `show` 클래스로 표시합니다. `hidden` 클래스는 요소를 숨깁니다. 화면은 `showScreen`으로 바꾸고, 바뀐 화면의 `.screen-heading`으로 포커스를 옮깁니다.
* 문제 데이터 (첫 번째 `<script>`): 배열 `quizQuestions`. 카테고리 순서대로 섹션 주석과 함께 정리되어 있습니다.
* 점수 계산 (두 번째 `<script>`): 클래스 `ScoreManager` (`calculateScore`, 항목별 점수를 돌려주는 `getBreakdown`, `getConsecutiveBonus`). DOM을 쓰지 않습니다.
* 기록 저장과 순위 (세 번째 `<script>`): 클래스 `LocalDataManager`(`saveGameResult`, `getGameHistory`, `getBestScore`, 설정 `getSetting`/`setSetting`)와 순위·통계 함수 `rankRecords`, `getLeaderboard`, `getPersonalBest`, `getPlayerStats`. DOM을 쓰지 않고, `localStorage`를 못 쓰면 메모리에 저장하므로 Node에서도 불러 테스트할 수 있습니다.
* 게임 로직 (네 번째 `<script>`): 게임 모드 `gameModes`, 문제 난이도 `questionLevels`와 `gameState` 객체로 상태를 관리하는 게임 로직. 흐름은 `initGame`(`pickQuestions`로 문제 선택) → `loadQuestion`(타이머 시작) → `handleAnswer` → (1초 뒤) `showFeedback` → `nextQuestion` → `endGame` → `displayResults`(`buildResult`로 결과 통계, `saveResult`로 기록 저장)입니다. 순위표는 `openLeaderboard`/`renderLeaderboard`, 내 기록은 `openStats`/`renderStats`(성장 그래프는 SVG로 그리는 `renderLineChart`)가 그립니다.
* 스타일 (`<style>`): CSS 변수(`--primary-color`, `--bg-color`, `--text-color` 등)를 쓰는 보라색 그라데이션 테마. 다크 모드는 같은 변수를 `prefers-color-scheme: dark`와 `:root[data-theme="dark"]`에서 다시 정의하므로, 새 색은 하드코딩하지 말고 변수로 추가해 두 곳에 모두 적습니다. `prefers-reduced-motion`이면 애니메이션을 끕니다.

네 `<script>`는 모듈 없이 순서대로 실행되는 일반 전역 스크립트라서, 게임 로직은 `quizQuestions`, `ScoreManager`, `LocalDataManager`와 순위 함수들이 전역에 있다고 가정합니다.

게임 로직은 원본 `quizQuestions`가 아니라 `initGame`에서 만든 복사본 `gameState.questions`를 사용합니다. 문제를 다루는 코드를 새로 쓸 때도 `gameState.questions`를 써야 순서 섞기가 반영됩니다.

## 문제 데이터 형식

`quizQuestions`의 각 항목:

```js
{ id, category, difficulty, question, options, correctAnswer, explanation }
```

* `category`: `한국사`, `세계지리`, `과학`, `예술과 문화` 중 하나. 게임 로직의 `categories`는 문제 데이터에서 자동으로 뽑지만, `index.html`의 카테고리 칩은 하드코딩되어 있으므로 카테고리를 바꾸면 칩도 함께 고칩니다.
* `difficulty`: `easy` | `medium` | `hard` (데이터에만 있고 화면에는 표시하지 않음)
* `options`: 정확히 4개의 문자열 (단축키 1~4가 선택지 4개를 전제로 함)
* `correctAnswer`: `options`의 인덱스(0부터 시작)
* 현재 81문제, 한국사 21문제 (easy 7, medium 9, hard 5), 나머지 카테고리마다 20문제 (easy 7, medium 9, hard 4). 문제 난이도 선택 때문에 카테고리마다 easy+medium과 medium+hard가 각각 10문제 이상이어야 합니다. `id`는 배열 순서대로 1부터 빠짐없이 매깁니다.
* 문제 수를 바꾸면 `index.html`의 부제("81개 문제에서 무작위 출제")와 `#totalQuestions` 기본값도 함께 고칩니다.

## 동작 참고

* 게임 모드 (`gameModes`)
  * 전체 도전: 카테고리마다 10문제씩 무작위로 뽑아 40문제
  * 카테고리 도전: 고른 카테고리에서 10문제 (카테고리 선택 상자는 이 모드에서만 보임)
  * 스피드 퀴즈: 전체에서 20문제, 문제당 15초. 시간이 다 되면 오답 처리
* 점수 (`ScoreManager`): 정답이면 기본 10점, 10초 안에 답하면 +3, 힌트를 안 쓰면 +2, 연속 정답 콤보 보너스(3~4연속 +2, 5~9연속 +3, 10연속 이상 +5, 이번 정답 포함). 오답과 시간 초과는 0점이고 연속 정답이 끊김. 피드백 모달에 점수 내역을 표시
* 문제 난이도 (`questionLevels`): 전체(모든 문제), 쉬움(easy·medium 문제), 어려움(medium·hard 문제). 모든 모드에 적용
* 문제는 모드와 난이도에 따라 항상 무작위로 뽑음. "문제 순서 섞기"(기본 체크)를 켜면 `shuffle`(Fisher-Yates)로 순서를 섞고, 끄면 `id` 순서로 나옴. 선택지 순서는 섞지 않음 (`correctAnswer` 인덱스 유지)
* 타이머: 모든 모드에서 문제마다 시간을 잼 (스피드 모드는 남은 시간과 시간 막대 표시). `performance.now()` 기준이고 일시정지한 시간은 빠짐
* 힌트: 게임당 3회, 문제당 1회. 오답 2개를 무작위로 지움 (`.option-btn.removed`)
* 일시정지: 답하기 전에만 가능. 문제를 가리고 타이머를 멈춤. "그만하고 결과 보기"를 누르면 답한 문제까지만 집계
* 결과 화면: 점수, 정답 개수, 정답률, 평균 응답 시간, 최장 연속 정답, 힌트 사용 횟수, 카테고리별 정답, 새 개인 최고 기록 여부와 전체 기간 순위. "결과 공유"는 결과 요약을 클립보드에 복사 (클립보드 API를 못 쓰면 `execCommand('copy')`)
* 기록 저장: 게임이 끝나면(중간 종료 포함, 한 문제도 안 풀면 제외) 플레이어 이름, 모드, 카테고리, 난이도, `buildResult` 결과, 시각을 `localStorage`의 `quizBasic.history`에 저장 (최근 1000판). 루트 버전과 같은 주소에서 배포되므로 키에는 `quizBasic.` 접두어를 붙임. 플레이어 이름(`quizBasic.player`), 테마(`quizBasic.theme`), 효과음(`quizBasic.sound`)도 저장
* 순위표: 기간(오늘 / 이번 주(월요일부터) / 전체 기간) × 게임 종류(전체 도전, 스피드 퀴즈, 카테고리 도전의 카테고리별) × 문제 난이도마다 따로 매김. 플레이어마다 최고 기록 하나씩 상위 10명. 점수, 정답률, 평균 응답 시간 순으로 비교하고 모두 같으면 같은 순위. 중간에 그만둔 게임은 순위와 개인 최고 기록에서 뺌
* 내 기록: 플레이어별 플레이 횟수, 푼 문제, 전체 정답률, 최장 연속 정답, 성장 그래프(최근 20판의 점수 또는 정답률, 게임 종류로 거름), 카테고리별 정답률 막대, 개인 최고 기록, 최근 10판. 모든 기록 삭제 버튼
* 설정 막대: 효과음(Web Audio로 만든 짧은 음, 기본 꺼짐), 다크 모드 전환 (처음에는 시스템 설정을 따름)
* 단축키: `1`~`4` 답 선택, `H` 힌트, `P`/`Esc` 일시정지 (한글 입력 상태에서도 되도록 `e.code`로 확인). `↑`/`↓`로 선택지 사이 이동. 피드백 모달이 뜨면 포커스가 "다음 문제" 버튼으로 가고 `Enter`로 다음 문제
* 화면 문구는 모두 한국어

## Git

별도 저장소가 아니라 상위 폴더 `study-03/`의 git 저장소(기본 브랜치 `main`)에 포함됩니다. 사용자가 명시적으로 요청할 때만 커밋합니다.

## 퀴즈 문제 교차 검증 가이드라인

모든 문제를 작성하거나 수정할 때 확인합니다.

1. **정답이 하나뿐인가?**
   * 다르게 해석될 수 있으면 조건을 명시 (예: 면적 기준, 2024년 기준)
2. **최상급 표현에 기준이 있는가?**
   * '가장 큰', '최초의' 등의 표현에 측정 기준을 명시
3. **시간과 범위가 명확한가?**
   * 변할 수 있는 정보는 시점을 명시
   * 지리적, 분류적 범위를 한정
4. **교차 검증했는가?**
   * 의심스러운 정보는 2개 이상의 출처로 확인
   * 논란이 있는 내용은 주류 학설을 기준으로 함

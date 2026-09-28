# CLAUDE.md

이 파일은 이 폴더에서 코드를 다룰 때 Claude Code(claude.ai/code)가 참고할 지침입니다.

## 프로젝트 개요

"퀴즈 게임 - 지식의 도전"은 한국어 4지선다 상식 퀴즈 웹 게임입니다. 순수 HTML/CSS/JavaScript로 만들었고 빌드 단계, 의존성, 서버가 없습니다. 브라우저에서 `index.html`을 열면 바로 실행됩니다.

상위 폴더(`study-03/`)의 "상식 퀴즈"와는 별개의 버전입니다. 함께 있는 zip 파일은 이 폴더의 최초 원본이며 수정하지 않습니다. 공개 저장소에는 올리지 않고 로컬에만 보관합니다 (`.gitignore`의 `*.zip`).

## 구조

* `index.html`: 화면 3개(`#startScreen`, `#quizScreen`, `#resultScreen`)와 피드백 모달(`#feedbackModal`), 일시정지 화면(`#pauseOverlay`). `active` 클래스가 붙은 화면만 보이고, 모달은 `show` 클래스로 표시합니다. `hidden` 클래스는 요소를 숨깁니다.
* `questions.js`: 문제 데이터 배열 `quizQuestions`. 카테고리 순서대로 섹션 주석과 함께 정리되어 있습니다.
* `score.js`: 점수 계산 클래스 `ScoreManager` (`calculateScore`, 항목별 점수를 돌려주는 `getBreakdown`, `getConsecutiveBonus`). DOM을 쓰지 않아서 Node에서도 `require`로 불러 테스트할 수 있습니다.
* `script.js`: 게임 모드 `gameModes`와 `gameState` 객체로 상태를 관리하는 게임 로직. 흐름은 `initGame`(`pickQuestions`로 문제 선택) → `loadQuestion`(타이머 시작) → `handleAnswer` → (1초 뒤) `showFeedback` → `nextQuestion` → `endGame` → `displayResults`(`buildResult`로 결과 통계)입니다.
* `style.css`: CSS 변수(`--primary-color` 등)를 쓰는 보라색 그라데이션 테마.

스크립트는 모듈 없이 `questions.js`, `score.js`, `script.js` 순서로 불러오는 일반 전역 스크립트입니다.

게임 로직은 원본 `quizQuestions`가 아니라 `initGame`에서 만든 복사본 `gameState.questions`를 사용합니다. 문제를 다루는 코드를 새로 쓸 때도 `gameState.questions`를 써야 순서 섞기가 반영됩니다.

## 문제 데이터 형식

`quizQuestions`의 각 항목:

```js
{ id, category, difficulty, question, options, correctAnswer, explanation }
```

* `category`: `한국사`, `세계지리`, `과학`, `예술과 문화` 중 하나. `script.js`의 `categories`는 문제 데이터에서 자동으로 뽑지만, `index.html`의 카테고리 칩은 하드코딩되어 있으므로 카테고리를 바꾸면 칩도 함께 고칩니다.
* `difficulty`: `easy` | `medium` | `hard` (데이터에만 있고 화면에는 표시하지 않음)
* `options`: 정확히 4개의 문자열 (단축키 1~4가 선택지 4개를 전제로 함)
* `correctAnswer`: `options`의 인덱스(0부터 시작)
* 현재 44문제, 카테고리마다 11문제 (easy 4, medium 5, hard 2). `id`는 배열 순서대로 1부터 빠짐없이 매깁니다.
* 문제 수를 바꾸면 `index.html`의 부제("44개의 도전적인 문제")와 `#totalQuestions` 기본값도 함께 고칩니다.

## 동작 참고

* 게임 모드 (`gameModes`)
  * 전체 도전: 카테고리마다 10문제씩 무작위로 뽑아 40문제
  * 카테고리 도전: 고른 카테고리에서 10문제 (카테고리 선택 상자는 이 모드에서만 보임)
  * 스피드 퀴즈: 전체에서 20문제, 문제당 15초. 시간이 다 되면 오답 처리
* 점수 (`score.js`): 정답이면 기본 10점, 10초 안에 답하면 +3, 힌트를 안 쓰면 +2, 연속 정답 콤보 보너스(3~4연속 +2, 5~9연속 +3, 10연속 이상 +5, 이번 정답 포함). 오답과 시간 초과는 0점이고 연속 정답이 끊김. 피드백 모달에 점수 내역을 표시
* 문제는 모드에 따라 항상 무작위로 뽑음. "문제 순서 섞기"(기본 체크)를 켜면 `shuffle`(Fisher-Yates)로 순서를 섞고, 끄면 `id` 순서로 나옴. 선택지 순서는 섞지 않음 (`correctAnswer` 인덱스 유지)
* 타이머: 모든 모드에서 문제마다 시간을 잼 (스피드 모드는 남은 시간과 시간 막대 표시). `performance.now()` 기준이고 일시정지한 시간은 빠짐
* 힌트: 게임당 3회, 문제당 1회. 오답 2개를 무작위로 지움 (`.option-btn.removed`)
* 일시정지: 답하기 전에만 가능. 문제를 가리고 타이머를 멈춤. "그만하고 결과 보기"를 누르면 답한 문제까지만 집계
* 결과 화면: 점수, 정답 개수, 정답률, 평균 응답 시간, 최장 연속 정답, 힌트 사용 횟수, 카테고리별 정답
* 단축키: `1`~`4` 답 선택, `H` 힌트, `P`/`Esc` 일시정지 (한글 입력 상태에서도 되도록 `e.code`로 확인). 피드백 모달이 떠 있을 때 `Enter`로 다음 문제
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

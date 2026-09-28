# CLAUDE.md

이 파일은 이 저장소에서 코드를 다룰 때 Claude Code(claude.ai/code)가 참고할 지침입니다.

## 프로젝트 개요

Study-03은 한국어 4지선다 상식 퀴즈 웹 게임입니다. 순수 HTML/CSS/JavaScript로 만들었고 빌드 단계, 의존성, 서버가 없습니다. 브라우저에서 `index.html`을 열면 바로 실행됩니다.

VibeCoding 학습 시리즈의 하나입니다 (Study-01: 데스크톱과 웹 앱, Study-02: 웹 할 일 앱).

## 구조

메인 프로젝트는 저장소 루트에 있습니다.

* `index.html`: 화면 3개(`#start-screen`, `#quiz-screen`, `#result-screen`). `active` 클래스가 붙은 화면만 보입니다.
* `questions.js`: 문제 데이터 `QUESTIONS`, 여기서 뽑아낸 `CATEGORIES`, 필터 함수 `getQuestionsByCategory(category)`. `"전체"`를 넘기면 모든 문제를 돌려줍니다.
* `app.js`: `state` 객체 하나로 상태를 관리하는 게임 로직. 흐름은 `initGame` → `loadQuestion` → `handleAnswer` → `showFeedback` → `nextQuestion` → `endGame`입니다.
* `style.css`: 카드 하나짜리 레이아웃. 난이도 배지 색은 `.difficulty.easy/.medium/.hard`로 정합니다.

스크립트는 모듈 없이 `questions.js`, `app.js` 순서로 불러오는 일반 전역 스크립트입니다. 따라서 `app.js`는 `QUESTIONS`, `CATEGORIES`, `getQuestionsByCategory`가 전역에 있다고 가정합니다.

`Study-03-basic/`은 함께 들어 있는 zip 파일을 풀어 놓은 별도의 참고용 버전입니다. `app.js` 대신 `script.js`를 쓰고, 피드백을 모달로 보여 주며, 카테고리별 결과가 있고, 카테고리 선택 기능은 없습니다. 요청이 없으면 수정하지 않는 읽기 전용 참고 자료로 취급합니다.

## 문제 데이터 형식

`QUESTIONS`의 각 항목:

```js
{ id, category, difficulty, question, options, correctAnswer, explanation }
```

* `category`: `한국사`, `과학`, `지리`, `일반상식` 중 하나. 새 값을 추가하면 카테고리 선택 목록에 자동으로 들어갑니다.
* `difficulty`: `easy` | `medium` | `hard` (CSS 클래스로도 쓰임)
* `options`: 정확히 4개의 문자열 (단축키 1~4가 선택지 4개를 전제로 함)
* `correctAnswer`: `options`의 인덱스(0부터 시작)
* 현재 44문제, 카테고리마다 11문제 (easy 4, medium 5, hard 2). `id`는 배열 순서대로 1부터 빠짐없이 매깁니다.

## 동작 참고

* 정답 한 문제에 10점 (`POINTS_PER_QUESTION`)
* 시작 화면의 "문제 순서 섞기"(기본 체크)를 켜면 `shuffle`(Fisher-Yates)로 문제 순서를 섞고, 끄면 배열 순서대로 나옴. 선택지 순서는 섞지 않음 (`correctAnswer` 인덱스 유지). `getQuestionsByCategory`가 복사본을 돌려주므로 원본 `QUESTIONS`는 바뀌지 않음
* `1`~`4` 키로 답을 고름. 답한 뒤에는 포커스가 다음 버튼으로 옮겨 가서 `Enter`로 넘어감
* 화면 문구는 모두 한국어

## Git

`study-03/` 폴더가 git 저장소 루트입니다 (기본 브랜치 `main`, 원격 `origin` = https://github.com/yoonok0311/study-03). `Study-03-basic/`도 같은 저장소에 포함됩니다. GitHub Pages(`main` 브랜치 루트)로 https://yoonok0311.github.io/study-03/ 에 배포되며, zip 원본과 대화 기록은 `.gitignore`로 저장소에서 제외합니다. 사용자가 명시적으로 요청할 때만 커밋합니다.

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

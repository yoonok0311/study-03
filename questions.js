// Created: 2026-09-26 21:46
// 카테고리별 11문제씩, 총 44문제
const QUESTIONS = [
  // 한국사
  { id: 1, category: "한국사", difficulty: "easy", question: "조선을 건국한 왕은?", options: ["이성계", "왕건", "이방원", "세종"], correctAnswer: 0, explanation: "이성계는 1392년 조선을 건국했습니다." },
  { id: 2, category: "한국사", difficulty: "easy", question: "훈민정음을 창제한 왕은?", options: ["태종", "세종", "성종", "정조"], correctAnswer: 1, explanation: "세종대왕이 1443년 훈민정음을 창제하고 1446년 반포했습니다." },
  { id: 3, category: "한국사", difficulty: "medium", question: "고려를 건국한 인물은?", options: ["궁예", "견훤", "왕건", "김부"], correctAnswer: 2, explanation: "왕건은 918년 고려를 건국했습니다." },
  { id: 4, category: "한국사", difficulty: "medium", question: "임진왜란 때 한산도 대첩을 이끈 장군은?", options: ["권율", "김시민", "곽재우", "이순신"], correctAnswer: 3, explanation: "이순신은 1592년 한산도 대첩에서 학익진으로 일본 수군을 크게 물리쳤습니다." },
  { id: 5, category: "한국사", difficulty: "medium", question: "3·1 운동이 일어난 해는?", options: ["1910년", "1919년", "1929년", "1945년"], correctAnswer: 1, explanation: "3·1 운동은 1919년 3월 1일에 일어났습니다." },
  { id: 6, category: "한국사", difficulty: "hard", question: "신라의 삼국 통일을 완성한 왕은?", options: ["무열왕", "문무왕", "진흥왕", "선덕여왕"], correctAnswer: 1, explanation: "문무왕은 676년 당나라 세력을 몰아내고 삼국 통일을 완성했습니다." },
  { id: 7, category: "한국사", difficulty: "medium", question: "정복 활동으로 영토를 크게 넓히고 '영락'이라는 연호를 쓴 고구려 왕은?", options: ["광개토대왕", "소수림왕", "장수왕", "고국천왕"], correctAnswer: 0, explanation: "광개토대왕은 '영락'이라는 연호를 쓰며 정복 활동으로 영토를 크게 넓혔습니다. 고구려의 최대 영토는 뒤를 이은 장수왕 때 이루어졌습니다." },
  { id: 8, category: "한국사", difficulty: "hard", question: "조선 후기 수원 화성을 축조한 왕은?", options: ["영조", "숙종", "정조", "순조"], correctAnswer: 2, explanation: "정조는 1796년 수원 화성을 완공했습니다." },
  { id: 9, category: "한국사", difficulty: "easy", question: "대한민국 정부가 수립된 해는?", options: ["1945년", "1948년", "1950년", "1953년"], correctAnswer: 1, explanation: "대한민국 정부는 1948년 8월 15일에 수립되었습니다." },
  { id: 10, category: "한국사", difficulty: "medium", question: "백제의 마지막 왕은?", options: ["성왕", "무왕", "근초고왕", "의자왕"], correctAnswer: 3, explanation: "의자왕 때인 660년 백제는 나당 연합군에 의해 멸망했습니다." },
  { id: 11, category: "한국사", difficulty: "easy", question: "고조선을 건국했다고 전해지는 인물은?", options: ["주몽", "단군왕검", "박혁거세", "온조"], correctAnswer: 1, explanation: "《삼국유사》에 따르면 단군왕검이 고조선을 건국했습니다. 주몽은 고구려, 박혁거세는 신라, 온조는 백제의 시조입니다." },

  // 과학
  { id: 12, category: "과학", difficulty: "easy", question: "물의 화학식은?", options: ["CO₂", "H₂O", "O₂", "NaCl"], correctAnswer: 1, explanation: "물은 수소 원자 2개와 산소 원자 1개로 이루어진 H₂O입니다." },
  { id: 13, category: "과학", difficulty: "easy", question: "지름 기준 태양계에서 가장 큰 행성은?", options: ["토성", "지구", "목성", "해왕성"], correctAnswer: 2, explanation: "목성은 지름이 약 14만 km로 태양계에서 가장 큰 행성입니다. 질량으로도 가장 큽니다." },
  { id: 14, category: "과학", difficulty: "medium", question: "진공에서 빛의 속도는 초속 약 몇 km인가?", options: ["3만 km", "30만 km", "300만 km", "3천 km"], correctAnswer: 1, explanation: "진공에서 빛의 속도는 초속 약 30만 km입니다." },
  { id: 15, category: "과학", difficulty: "easy", question: "식물이 빛 에너지를 이용해 양분을 만드는 과정은?", options: ["호흡", "증산 작용", "광합성", "발효"], correctAnswer: 2, explanation: "광합성은 빛 에너지로 이산화탄소와 물에서 포도당을 만드는 과정입니다." },
  { id: 16, category: "과학", difficulty: "medium", question: "원소 기호 'Fe'가 나타내는 원소는?", options: ["철", "불소", "금", "납"], correctAnswer: 0, explanation: "Fe는 라틴어 ferrum에서 온 철의 원소 기호입니다." },
  { id: 17, category: "과학", difficulty: "medium", question: "사람의 혈액에서 산소를 운반하는 세포는?", options: ["백혈구", "혈소판", "적혈구", "림프구"], correctAnswer: 2, explanation: "적혈구의 헤모글로빈이 산소를 운반합니다." },
  { id: 18, category: "과학", difficulty: "hard", question: "상대성 이론을 발표한 과학자는?", options: ["뉴턴", "아인슈타인", "보어", "갈릴레이"], correctAnswer: 1, explanation: "아인슈타인은 1905년 특수 상대성 이론, 1915년 일반 상대성 이론을 발표했습니다." },
  { id: 19, category: "과학", difficulty: "medium", question: "1기압에서 물이 끓는 온도는?", options: ["90℃", "100℃", "110℃", "120℃"], correctAnswer: 1, explanation: "1기압에서 물의 끓는점은 약 100℃입니다. 현재 온도 기준으로 정밀하게 재면 약 99.97℃입니다." },
  { id: 20, category: "과학", difficulty: "hard", question: "DNA의 이중 나선 구조를 밝힌 과학자로 알려진 두 사람은?", options: ["왓슨과 크릭", "멘델과 다윈", "퀴리 부부", "파스퇴르와 코흐"], correctAnswer: 0, explanation: "왓슨과 크릭은 1953년 DNA 이중 나선 구조 모델을 발표했습니다. 이 발견에는 로절린드 프랭클린의 X선 회절 사진도 중요한 역할을 했습니다." },
  { id: 21, category: "과학", difficulty: "easy", question: "지구의 자연 위성은?", options: ["화성", "금성", "달", "태양"], correctAnswer: 2, explanation: "달은 지구의 유일한 영구적인 자연 위성입니다." },
  { id: 22, category: "과학", difficulty: "medium", question: "원자 번호 1번인 원소는?", options: ["헬륨", "수소", "산소", "탄소"], correctAnswer: 1, explanation: "수소는 양성자 1개를 가진 원자 번호 1번 원소로, 가장 가볍습니다." },

  // 지리
  { id: 23, category: "지리", difficulty: "easy", question: "세계에서 가장 넓은 대양은?", options: ["대서양", "인도양", "북극해", "태평양"], correctAnswer: 3, explanation: "태평양은 지구 표면의 약 3분의 1을 차지하는 가장 넓은 대양입니다." },
  { id: 24, category: "지리", difficulty: "easy", question: "해발 고도 기준 세계에서 가장 높은 산은?", options: ["K2", "에베레스트", "킬리만자로", "몽블랑"], correctAnswer: 1, explanation: "에베레스트산은 해발 약 8,849m로 세계에서 가장 높습니다. 산기슭부터 잰 높이로는 하와이의 마우나케아가 더 높습니다." },
  { id: 25, category: "지리", difficulty: "medium", question: "호주의 수도는?", options: ["시드니", "멜버른", "캔버라", "퍼스"], correctAnswer: 2, explanation: "호주의 수도는 캔버라입니다." },
  { id: 26, category: "지리", difficulty: "medium", question: "면적 기준 세계에서 가장 큰 나라는?", options: ["캐나다", "중국", "미국", "러시아"], correctAnswer: 3, explanation: "러시아는 면적이 약 1,700만 km²로 세계에서 가장 큽니다." },
  { id: 27, category: "지리", difficulty: "easy", question: "한반도에서 가장 높은 산은?", options: ["한라산", "지리산", "설악산", "백두산"], correctAnswer: 3, explanation: "백두산이 한반도에서 가장 높은 산입니다. 높이는 우리나라 측량 기준 2,744m이며, 기준 해수면이 달라 북한은 2,750m, 중국은 2,749m로 발표합니다. 남한에서는 한라산이 가장 높습니다." },
  { id: 28, category: "지리", difficulty: "medium", question: "면적 기준 세계에서 가장 큰 사막(극지방 제외)은?", options: ["고비 사막", "사하라 사막", "아라비아 사막", "칼라하리 사막"], correctAnswer: 1, explanation: "극지방을 제외하면 사하라 사막(약 920만 km²)이 면적 기준 세계에서 가장 큰 사막입니다." },
  { id: 29, category: "지리", difficulty: "medium", question: "캐나다의 수도는?", options: ["토론토", "밴쿠버", "오타와", "몬트리올"], correctAnswer: 2, explanation: "캐나다의 수도는 오타와입니다." },
  { id: 30, category: "지리", difficulty: "medium", question: "나일강이 흘러 들어가는 바다는?", options: ["홍해", "지중해", "아라비아해", "흑해"], correctAnswer: 1, explanation: "나일강은 이집트를 지나 지중해로 흘러 들어갑니다." },
  { id: 31, category: "지리", difficulty: "hard", question: "남아메리카 대륙에서 가장 넓은 나라는?", options: ["아르헨티나", "브라질", "페루", "콜롬비아"], correctAnswer: 1, explanation: "브라질은 남아메리카 면적의 약 절반을 차지합니다." },
  { id: 32, category: "지리", difficulty: "easy", question: "일본의 수도는?", options: ["오사카", "교토", "도쿄", "나고야"], correctAnswer: 2, explanation: "일본의 수도는 도쿄입니다." },
  { id: 33, category: "지리", difficulty: "hard", question: "현재 면적 기준 아프리카 대륙에서 가장 큰 나라는?", options: ["수단", "콩고민주공화국", "알제리", "리비아"], correctAnswer: 2, explanation: "알제리(약 238만 km²)가 아프리카에서 가장 큽니다. 2011년 남수단이 분리 독립하기 전에는 수단이 가장 컸습니다." },

  // 일반상식
  { id: 34, category: "일반상식", difficulty: "easy", question: "1년은 며칠인가? (평년 기준)", options: ["360일", "364일", "365일", "366일"], correctAnswer: 2, explanation: "평년은 365일, 윤년은 366일입니다." },
  { id: 35, category: "일반상식", difficulty: "easy", question: "올림픽 오륜기의 고리는 몇 개인가?", options: ["4개", "5개", "6개", "7개"], correctAnswer: 1, explanation: "오륜기는 다섯 대륙을 상징하는 5개의 고리로 이루어져 있습니다." },
  { id: 36, category: "일반상식", difficulty: "medium", question: "'모나리자'를 그린 화가는?", options: ["미켈란젤로", "라파엘로", "레오나르도 다빈치", "렘브란트"], correctAnswer: 2, explanation: "모나리자는 레오나르도 다빈치의 작품입니다." },
  { id: 37, category: "일반상식", difficulty: "medium", question: "축구 경기 시작 시 한 팀의 경기장 위 선수는 몇 명인가?", options: ["9명", "10명", "11명", "12명"], correctAnswer: 2, explanation: "축구는 골키퍼를 포함해 한 팀 11명으로 경기를 시작합니다. 퇴장이 나오면 경기 중 인원이 줄어들 수 있습니다." },
  { id: 38, category: "일반상식", difficulty: "easy", question: "우리나라에서 무지개의 색은 흔히 몇 가지로 표현하는가?", options: ["5가지", "6가지", "7가지", "8가지"], correctAnswer: 2, explanation: "우리나라에서는 무지개를 흔히 빨주노초파남보 7가지 색으로 표현합니다. 나라와 문화에 따라 6가지나 5가지로 표현하기도 합니다." },
  { id: 39, category: "일반상식", difficulty: "medium", question: "'운명 교향곡'으로 알려진 교향곡 5번의 작곡가는?", options: ["모차르트", "베토벤", "바흐", "쇼팽"], correctAnswer: 1, explanation: "교향곡 5번 '운명'은 베토벤의 작품입니다." },
  { id: 40, category: "일반상식", difficulty: "hard", question: "UN(국제연합)이 창설된 해는?", options: ["1919년", "1939년", "1945년", "1950년"], correctAnswer: 2, explanation: "UN은 제2차 세계대전 직후인 1945년에 창설되었습니다." },
  { id: 41, category: "일반상식", difficulty: "medium", question: "현재 발행되는 대한민국 지폐 중 세종대왕이 그려진 지폐는?", options: ["천 원권", "오천 원권", "만 원권", "오만 원권"], correctAnswer: 2, explanation: "현재 발행되는 만 원권에는 세종대왕이 그려져 있습니다." },
  { id: 42, category: "일반상식", difficulty: "hard", question: "체스에서 게임 시작 시 한 사람이 가진 말은 몇 개인가?", options: ["12개", "14개", "16개", "18개"], correctAnswer: 2, explanation: "체스는 한 사람당 16개(폰 8, 룩 2, 나이트 2, 비숍 2, 퀸 1, 킹 1)의 말로 시작합니다." },
  { id: 43, category: "일반상식", difficulty: "medium", question: "표준 피아노의 건반은 모두 몇 개인가?", options: ["66개", "76개", "88개", "96개"], correctAnswer: 2, explanation: "표준 피아노는 흰 건반 52개와 검은 건반 36개, 모두 88개의 건반으로 이루어져 있습니다." },
  { id: 44, category: "일반상식", difficulty: "easy", question: "하루는 몇 시간인가?", options: ["12시간", "20시간", "24시간", "36시간"], correctAnswer: 2, explanation: "하루는 24시간입니다." },
];

const CATEGORIES = [...new Set(QUESTIONS.map((q) => q.category))];

// 카테고리별 문제 필터링 ("전체"면 모든 문제)
function getQuestionsByCategory(category) {
  if (!category || category === "전체") return QUESTIONS.slice();
  return QUESTIONS.filter((q) => q.category === category);
}

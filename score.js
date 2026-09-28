// Created: 2026-09-28 14:27
// 점수 계산
const BASE_POINTS = 10;
const TIME_BONUS = 3; // TIME_BONUS_LIMIT초 안에 맞히면
const TIME_BONUS_LIMIT = 10;
const NO_HINT_BONUS = 2;
// 연속 정답 수가 min 이상이면 bonus (위에서부터 먼저 맞는 구간 적용)
const COMBO_BONUS_TABLE = [
  { min: 10, bonus: 5 },
  { min: 5, bonus: 3 },
  { min: 3, bonus: 2 },
];

class ScoreManager {
  // consecutiveCorrect: 이번 정답을 포함한 연속 정답 수
  getConsecutiveBonus(consecutiveCorrect) {
    const tier = COMBO_BONUS_TABLE.find((t) => consecutiveCorrect >= t.min);
    return tier ? tier.bonus : 0;
  }

  // 항목별 점수. 오답이면 모두 0
  getBreakdown(isCorrect, timeSpent, consecutiveCorrect, hintUsed) {
    if (!isCorrect) return { base: 0, time: 0, noHint: 0, combo: 0 };
    return {
      base: BASE_POINTS,
      time: timeSpent < TIME_BONUS_LIMIT ? TIME_BONUS : 0,
      noHint: hintUsed ? 0 : NO_HINT_BONUS,
      combo: this.getConsecutiveBonus(consecutiveCorrect),
    };
  }

  calculateScore(isCorrect, timeSpent, consecutiveCorrect, hintUsed) {
    const b = this.getBreakdown(isCorrect, timeSpent, consecutiveCorrect, hintUsed);
    return b.base + b.time + b.noHint + b.combo;
  }
}

if (typeof module !== "undefined") module.exports = { ScoreManager };

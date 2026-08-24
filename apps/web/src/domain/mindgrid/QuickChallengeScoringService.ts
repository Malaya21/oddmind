import type {
  QuickChallenge,
  QuickChallengeCategory,
} from "@/types/quick-challenge";

export interface QuickChallengeEvaluation {
  isCorrect: boolean;
  score: number; // 0 - 100
  timeBonus: number; // 0 - 10
  dimensionContributions: {
    logicalDeduction?: number;
    patternRecognition?: number;
    problemSolving?: number;
    decisionMaking?: number;
    attentionToDetail?: number;
    planning?: number;
  };
}

export class QuickChallengeScoringService {
  public normalizeAnswer(str: string): string {
    return str
      .trim()
      .toLowerCase()
      .replace(/[\s\-_$]/g, "")
      .replace(/^0+/, (match) => (match.length > 0 ? "0" : "")); // keep meaningful zeros
  }

  public evaluateAnswer(
    challenge: QuickChallenge,
    userAnswer: string,
    durationSec: number,
  ): QuickChallengeEvaluation {
    const rawNormalized = this.normalizeAnswer(userAnswer);
    const rawTrimmed = userAnswer.trim().toLowerCase();

    const isCorrect = challenge.solution.acceptedAnswers.some((accepted) => {
      const accNorm = this.normalizeAnswer(accepted);
      const accTrim = accepted.trim().toLowerCase();
      return (
        rawNormalized === accNorm ||
        rawTrimmed === accTrim ||
        userAnswer.trim() === accepted.trim()
      );
    });

    // Time bonus: 0 - 10 points
    const limit = challenge.timeLimitSec;
    let timeBonus = 0;
    if (isCorrect) {
      if (durationSec <= limit * 0.5) {
        timeBonus = 10;
      } else if (durationSec <= limit) {
        timeBonus = Math.max(
          2,
          Math.round(10 - ((durationSec - limit * 0.5) / (limit * 0.5)) * 8),
        );
      } else {
        timeBonus = 1;
      }
    }

    // Base score calculation
    let score = 0;
    if (isCorrect) {
      const correctnessPoints = 70;
      const reasoningPoints = 20;
      score = correctnessPoints + reasoningPoints + timeBonus;
      score = Math.min(100, Math.max(75, score));
    } else {
      // Partial credit for attempting within time limit
      score = durationSec <= limit ? 15 : 5;
    }

    // Cognitive dimension mapping by category
    const dimensionContributions = this.mapDimensions(
      challenge.category,
      score,
      isCorrect,
    );

    return {
      isCorrect,
      score,
      timeBonus,
      dimensionContributions,
    };
  }

  private mapDimensions(
    category: QuickChallengeCategory,
    score: number,
    isCorrect: boolean,
  ) {
    const s = score;
    switch (category) {
      case "CODE_BREAKER":
        return {
          logicalDeduction: Math.round(s * 0.4),
          attentionToDetail: Math.round(s * 0.35),
          problemSolving: Math.round(s * 0.25),
        };
      case "PATTERN_LOGIC":
        return {
          patternRecognition: Math.round(s * 0.5),
          problemSolving: Math.round(s * 0.3),
          attentionToDetail: Math.round(s * 0.2),
        };
      case "SEQUENCE":
        return {
          patternRecognition: Math.round(s * 0.4),
          attentionToDetail: Math.round(s * 0.35),
          logicalDeduction: Math.round(s * 0.25),
        };
      case "OPTIMIZATION":
        return {
          planning: Math.round(s * 0.5),
          problemSolving: Math.round(s * 0.3),
          decisionMaking: Math.round(s * 0.2),
        };
      case "LOGIC_DEDUCTION":
        return {
          logicalDeduction: Math.round(s * 0.45),
          decisionMaking: Math.round(s * 0.35),
          attentionToDetail: Math.round(s * 0.2),
        };
    }
  }
}

export const quickChallengeScoringService = new QuickChallengeScoringService();

import type {
  QuickChallengeUserProgress,
  QuickChallenge,
  QuickPlaySession,
} from "@/types/quick-challenge";
import type { QuickChallengeEvaluation } from "@/domain/mindgrid/QuickChallengeScoringService";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import type {
  CollectionReference,
  DocumentData,
} from "firebase-admin/firestore";

export interface IQuickChallengeProgressRepository {
  getProgress(userId: string): Promise<QuickChallengeUserProgress | null>;
  saveProgress(progress: QuickChallengeUserProgress): Promise<void>;
  updateProgressWithResult(
    userId: string,
    challenge: QuickChallenge,
    evaluation: QuickChallengeEvaluation,
  ): Promise<QuickChallengeUserProgress>;
  updateProgressWithQuickPlay(
    userId: string,
    quickPlay: QuickPlaySession,
  ): Promise<QuickChallengeUserProgress>;
}

export class FirestoreQuickChallengeProgressRepository
  implements IQuickChallengeProgressRepository
{
  private get collection(): CollectionReference<DocumentData> {
    return getAdminFirestore().collection("quickChallengeProgress");
  }

  async getProgress(userId: string): Promise<QuickChallengeUserProgress | null> {
    const snap = await this.collection.doc(userId).get();
    if (!snap.exists) return null;
    return snap.data() as QuickChallengeUserProgress;
  }

  async saveProgress(progress: QuickChallengeUserProgress): Promise<void> {
    const clean = JSON.parse(JSON.stringify(progress));
    await this.collection.doc(progress.userId).set(clean, { merge: true });
  }

  async updateProgressWithResult(
    userId: string,
    challenge: QuickChallenge,
    evaluation: QuickChallengeEvaluation,
  ): Promise<QuickChallengeUserProgress> {
    const existing = (await this.getProgress(userId)) || this.createDefault(userId);

    const completedSet = new Set(existing.completedChallengeIds);
    if (evaluation.isCorrect) {
      completedSet.add(challenge.id);
    }

    const cat = challenge.category;
    const prevCat = existing.categoryStats[cat] || {
      attempted: 0,
      solved: 0,
      bestScore: 0,
      averageScore: 0,
    };

    const newAttempted = prevCat.attempted + 1;
    const newSolved = prevCat.solved + (evaluation.isCorrect ? 1 : 0);
    const newBestScore = Math.max(prevCat.bestScore, evaluation.score);
    const newAvgScore = Math.round(
      (prevCat.averageScore * prevCat.attempted + evaluation.score) / newAttempted,
    );

    const updatedCategoryStats = {
      ...existing.categoryStats,
      [cat]: {
        attempted: newAttempted,
        solved: newSolved,
        bestScore: newBestScore,
        averageScore: newAvgScore,
      },
    };

    // Calculate aggregated thinking profile
    const profile = this.computeAggregatedProfile(updatedCategoryStats, completedSet.size);

    const updatedProgress: QuickChallengeUserProgress = {
      userId,
      completedChallengeIds: Array.from(completedSet),
      categoryStats: updatedCategoryStats,
      quickPlayStats: existing.quickPlayStats,
      thinkingProfile: profile,
      updatedAt: new Date().toISOString(),
    };

    await this.saveProgress(updatedProgress);
    return updatedProgress;
  }

  async updateProgressWithQuickPlay(
    userId: string,
    quickPlay: QuickPlaySession,
  ): Promise<QuickChallengeUserProgress> {
    const existing = (await this.getProgress(userId)) || this.createDefault(userId);

    const correctInPlay = quickPlay.stepResults.filter((s) => s.isCorrect).length;
    const updatedQuickPlayStats = {
      played: existing.quickPlayStats.played + 1,
      bestScore: Math.max(existing.quickPlayStats.bestScore, quickPlay.totalScore),
      totalCorrect: existing.quickPlayStats.totalCorrect + correctInPlay,
    };

    const updatedProgress: QuickChallengeUserProgress = {
      ...existing,
      quickPlayStats: updatedQuickPlayStats,
      updatedAt: new Date().toISOString(),
    };

    await this.saveProgress(updatedProgress);
    return updatedProgress;
  }

  private computeAggregatedProfile(
    stats: QuickChallengeUserProgress["categoryStats"],
    totalCompleted: number,
  ) {
    const cb = stats.CODE_BREAKER?.averageScore || 0;
    const pl = stats.PATTERN_LOGIC?.averageScore || 0;
    const seq = stats.SEQUENCE?.averageScore || 0;
    const opt = stats.OPTIMIZATION?.averageScore || 0;
    const ld = stats.LOGIC_DEDUCTION?.averageScore || 0;

    return {
      logicalDeduction: Math.round(ld * 0.5 + cb * 0.35 + seq * 0.15),
      patternRecognition: Math.round(pl * 0.55 + seq * 0.45),
      problemSolving: Math.round(opt * 0.4 + cb * 0.3 + pl * 0.3),
      decisionMaking: Math.round(ld * 0.5 + opt * 0.5),
      attentionToDetail: Math.round(cb * 0.4 + seq * 0.35 + ld * 0.25),
      planning: Math.round(opt * 0.75 + cb * 0.25),
      totalChallengesCompleted: totalCompleted,
    };
  }

  private createDefault(userId: string): QuickChallengeUserProgress {
    return {
      userId,
      completedChallengeIds: [],
      categoryStats: {
        CODE_BREAKER: { attempted: 0, solved: 0, bestScore: 0, averageScore: 0 },
        PATTERN_LOGIC: { attempted: 0, solved: 0, bestScore: 0, averageScore: 0 },
        SEQUENCE: { attempted: 0, solved: 0, bestScore: 0, averageScore: 0 },
        OPTIMIZATION: { attempted: 0, solved: 0, bestScore: 0, averageScore: 0 },
        LOGIC_DEDUCTION: { attempted: 0, solved: 0, bestScore: 0, averageScore: 0 },
      },
      quickPlayStats: {
        played: 0,
        bestScore: 0,
        totalCorrect: 0,
      },
      thinkingProfile: {
        logicalDeduction: 0,
        patternRecognition: 0,
        problemSolving: 0,
        decisionMaking: 0,
        attentionToDetail: 0,
        planning: 0,
        totalChallengesCompleted: 0,
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

export class InMemoryQuickChallengeProgressRepository
  implements IQuickChallengeProgressRepository
{
  private progressMap: Map<string, QuickChallengeUserProgress> = new Map();

  async getProgress(userId: string): Promise<QuickChallengeUserProgress | null> {
    const p = this.progressMap.get(userId);
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  async saveProgress(progress: QuickChallengeUserProgress): Promise<void> {
    this.progressMap.set(progress.userId, JSON.parse(JSON.stringify(progress)));
  }

  async updateProgressWithResult(
    userId: string,
    challenge: QuickChallenge,
    evaluation: QuickChallengeEvaluation,
  ): Promise<QuickChallengeUserProgress> {
    const existing = (await this.getProgress(userId)) || this.createDefault(userId);

    const completedSet = new Set(existing.completedChallengeIds);
    if (evaluation.isCorrect) {
      completedSet.add(challenge.id);
    }

    const cat = challenge.category;
    const prevCat = existing.categoryStats[cat] || {
      attempted: 0,
      solved: 0,
      bestScore: 0,
      averageScore: 0,
    };

    const newAttempted = prevCat.attempted + 1;
    const newSolved = prevCat.solved + (evaluation.isCorrect ? 1 : 0);
    const newBestScore = Math.max(prevCat.bestScore, evaluation.score);
    const newAvgScore = Math.round(
      (prevCat.averageScore * prevCat.attempted + evaluation.score) / newAttempted,
    );

    const updatedCategoryStats = {
      ...existing.categoryStats,
      [cat]: {
        attempted: newAttempted,
        solved: newSolved,
        bestScore: newBestScore,
        averageScore: newAvgScore,
      },
    };

    const profile = {
      logicalDeduction: Math.round(
        (updatedCategoryStats.LOGIC_DEDUCTION?.averageScore || 0) * 0.5 +
          (updatedCategoryStats.CODE_BREAKER?.averageScore || 0) * 0.35 +
          (updatedCategoryStats.SEQUENCE?.averageScore || 0) * 0.15,
      ),
      patternRecognition: Math.round(
        (updatedCategoryStats.PATTERN_LOGIC?.averageScore || 0) * 0.55 +
          (updatedCategoryStats.SEQUENCE?.averageScore || 0) * 0.45,
      ),
      problemSolving: Math.round(
        (updatedCategoryStats.OPTIMIZATION?.averageScore || 0) * 0.4 +
          (updatedCategoryStats.CODE_BREAKER?.averageScore || 0) * 0.3 +
          (updatedCategoryStats.PATTERN_LOGIC?.averageScore || 0) * 0.3,
      ),
      decisionMaking: Math.round(
        (updatedCategoryStats.LOGIC_DEDUCTION?.averageScore || 0) * 0.5 +
          (updatedCategoryStats.OPTIMIZATION?.averageScore || 0) * 0.5,
      ),
      attentionToDetail: Math.round(
        (updatedCategoryStats.CODE_BREAKER?.averageScore || 0) * 0.4 +
          (updatedCategoryStats.SEQUENCE?.averageScore || 0) * 0.35 +
          (updatedCategoryStats.LOGIC_DEDUCTION?.averageScore || 0) * 0.25,
      ),
      planning: Math.round(
        (updatedCategoryStats.OPTIMIZATION?.averageScore || 0) * 0.75 +
          (updatedCategoryStats.CODE_BREAKER?.averageScore || 0) * 0.25,
      ),
      totalChallengesCompleted: completedSet.size,
    };

    const updatedProgress: QuickChallengeUserProgress = {
      userId,
      completedChallengeIds: Array.from(completedSet),
      categoryStats: updatedCategoryStats,
      quickPlayStats: existing.quickPlayStats,
      thinkingProfile: profile,
      updatedAt: new Date().toISOString(),
    };

    await this.saveProgress(updatedProgress);
    return updatedProgress;
  }

  async updateProgressWithQuickPlay(
    userId: string,
    quickPlay: QuickPlaySession,
  ): Promise<QuickChallengeUserProgress> {
    const existing = (await this.getProgress(userId)) || this.createDefault(userId);

    const correctInPlay = quickPlay.stepResults.filter((s) => s.isCorrect).length;
    const updatedQuickPlayStats = {
      played: existing.quickPlayStats.played + 1,
      bestScore: Math.max(existing.quickPlayStats.bestScore, quickPlay.totalScore),
      totalCorrect: existing.quickPlayStats.totalCorrect + correctInPlay,
    };

    const updatedProgress: QuickChallengeUserProgress = {
      ...existing,
      quickPlayStats: updatedQuickPlayStats,
      updatedAt: new Date().toISOString(),
    };

    await this.saveProgress(updatedProgress);
    return updatedProgress;
  }

  private createDefault(userId: string): QuickChallengeUserProgress {
    return {
      userId,
      completedChallengeIds: [],
      categoryStats: {
        CODE_BREAKER: { attempted: 0, solved: 0, bestScore: 0, averageScore: 0 },
        PATTERN_LOGIC: { attempted: 0, solved: 0, bestScore: 0, averageScore: 0 },
        SEQUENCE: { attempted: 0, solved: 0, bestScore: 0, averageScore: 0 },
        OPTIMIZATION: { attempted: 0, solved: 0, bestScore: 0, averageScore: 0 },
        LOGIC_DEDUCTION: { attempted: 0, solved: 0, bestScore: 0, averageScore: 0 },
      },
      quickPlayStats: {
        played: 0,
        bestScore: 0,
        totalCorrect: 0,
      },
      thinkingProfile: {
        logicalDeduction: 0,
        patternRecognition: 0,
        problemSolving: 0,
        decisionMaking: 0,
        attentionToDetail: 0,
        planning: 0,
        totalChallengesCompleted: 0,
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

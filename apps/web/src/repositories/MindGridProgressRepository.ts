import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import type {
  MindGridUserProgress,
  MindGridCaseResult,
} from "@/types/mindgrid";

export interface IMindGridProgressRepository {
  getProgress(userId: string): Promise<MindGridUserProgress | null>;
  saveProgress(progress: MindGridUserProgress): Promise<void>;
  updateProgressWithResult(
    userId: string,
    caseId: string,
    result: MindGridCaseResult,
  ): Promise<MindGridUserProgress>;
}

export class FirestoreMindGridProgressRepository
  implements IMindGridProgressRepository
{
  private get collection() {
    return getAdminFirestore().collection("mindgridProgress");
  }

  async getProgress(userId: string): Promise<MindGridUserProgress | null> {
    const snap = await this.collection.doc(userId).get();
    if (!snap.exists) return null;
    return snap.data() as MindGridUserProgress;
  }

  async saveProgress(progress: MindGridUserProgress): Promise<void> {
    const clean = JSON.parse(JSON.stringify(progress));
    await this.collection.doc(progress.userId).set(clean, { merge: true });
  }

  async updateProgressWithResult(
    userId: string,
    caseId: string,
    result: MindGridCaseResult,
  ): Promise<MindGridUserProgress> {
    const existing = (await this.getProgress(userId)) || {
      userId,
      completedCaseIds: [],
      caseStats: {},
      aggregateThinkingProfile: {
        logicalDeduction: 0,
        attentionToDetail: 0,
        evidenceEvaluation: 0,
        planning: 0,
        timelineReasoning: 0,
        contradictionDetection: 0,
        totalCasesCompleted: 0,
      },
      totalSolved: 0,
      totalAttempted: 0,
      updatedAt: new Date().toISOString(),
    };

    const prevStat = existing.caseStats[caseId] || {
      completed: false,
      bestScore: 0,
      attempts: 0,
      bestDurationSec: result.durationSec,
      lastPlayedAt: new Date().toISOString(),
    };

    const isNewlyCompleted = result.isSolved && !prevStat.completed;
    const isCompleted = prevStat.completed || result.isSolved;
    const bestScore = Math.max(prevStat.bestScore, result.score.overallScore);
    const bestDurationSec = result.isSolved
      ? Math.min(prevStat.bestDurationSec || result.durationSec, result.durationSec)
      : prevStat.bestDurationSec;

    const completedCaseSet = new Set(existing.completedCaseIds);
    if (result.isSolved) {
      completedCaseSet.add(caseId);
    }

    const updatedCaseStats = {
      ...existing.caseStats,
      [caseId]: {
        completed: isCompleted,
        bestScore,
        attempts: prevStat.attempts + 1,
        bestDurationSec,
        lastPlayedAt: new Date().toISOString(),
        lastScoreBreakdown: result.score,
      },
    };

    // Aggregate Thinking Profile across completed cases (or latest attempts)
    const statsEntries = Object.values(updatedCaseStats) as Array<any>;
    const scoredCases = statsEntries.filter((s) => s.lastScoreBreakdown);
    const count = scoredCases.length || 1;

    const aggregateProfile = {
      logicalDeduction: Math.round(
        scoredCases.reduce((acc, s) => acc + s.lastScoreBreakdown.deductionScore, 0) / count,
      ),
      attentionToDetail: Math.round(
        scoredCases.reduce((acc, s) => acc + s.lastScoreBreakdown.attentionToDetailScore, 0) / count,
      ),
      evidenceEvaluation: Math.round(
        scoredCases.reduce((acc, s) => acc + s.lastScoreBreakdown.evidenceEvaluationScore, 0) / count,
      ),
      planning: Math.round(
        scoredCases.reduce((acc, s) => acc + s.lastScoreBreakdown.planningScore, 0) / count,
      ),
      timelineReasoning: Math.round(
        scoredCases.reduce((acc, s) => acc + s.lastScoreBreakdown.timelineReasoningScore, 0) / count,
      ),
      contradictionDetection: Math.round(
        scoredCases.reduce((acc, s) => acc + s.lastScoreBreakdown.contradictionDetectionScore, 0) / count,
      ),
      totalCasesCompleted: completedCaseSet.size,
    };

    const updatedProgress: MindGridUserProgress = {
      userId,
      completedCaseIds: Array.from(completedCaseSet),
      caseStats: updatedCaseStats,
      aggregateThinkingProfile: aggregateProfile,
      totalSolved: existing.totalSolved + (isNewlyCompleted ? 1 : 0),
      totalAttempted: existing.totalAttempted + 1,
      updatedAt: new Date().toISOString(),
    };

    await this.saveProgress(updatedProgress);
    return updatedProgress;
  }
}

export class InMemoryMindGridProgressRepository
  implements IMindGridProgressRepository
{
  private progressMap: Map<string, MindGridUserProgress> = new Map();

  async getProgress(userId: string): Promise<MindGridUserProgress | null> {
    const p = this.progressMap.get(userId);
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  async saveProgress(progress: MindGridUserProgress): Promise<void> {
    this.progressMap.set(progress.userId, JSON.parse(JSON.stringify(progress)));
  }

  async updateProgressWithResult(
    userId: string,
    caseId: string,
    result: MindGridCaseResult,
  ): Promise<MindGridUserProgress> {
    const firestoreRepo = new FirestoreMindGridProgressRepository();
    // Use same computation logic
    const existing = (await this.getProgress(userId)) || {
      userId,
      completedCaseIds: [],
      caseStats: {},
      aggregateThinkingProfile: {
        logicalDeduction: 0,
        attentionToDetail: 0,
        evidenceEvaluation: 0,
        planning: 0,
        timelineReasoning: 0,
        contradictionDetection: 0,
        totalCasesCompleted: 0,
      },
      totalSolved: 0,
      totalAttempted: 0,
      updatedAt: new Date().toISOString(),
    };

    const prevStat = existing.caseStats[caseId] || {
      completed: false,
      bestScore: 0,
      attempts: 0,
      bestDurationSec: result.durationSec,
      lastPlayedAt: new Date().toISOString(),
    };

    const isNewlyCompleted = result.isSolved && !prevStat.completed;
    const isCompleted = prevStat.completed || result.isSolved;
    const bestScore = Math.max(prevStat.bestScore, result.score.overallScore);
    const bestDurationSec = result.isSolved
      ? Math.min(prevStat.bestDurationSec || result.durationSec, result.durationSec)
      : prevStat.bestDurationSec;

    const completedCaseSet = new Set(existing.completedCaseIds);
    if (result.isSolved) {
      completedCaseSet.add(caseId);
    }

    const updatedCaseStats = {
      ...existing.caseStats,
      [caseId]: {
        completed: isCompleted,
        bestScore,
        attempts: prevStat.attempts + 1,
        bestDurationSec,
        lastPlayedAt: new Date().toISOString(),
        lastScoreBreakdown: result.score,
      },
    };

    const statsEntries = Object.values(updatedCaseStats) as Array<any>;
    const scoredCases = statsEntries.filter((s) => s.lastScoreBreakdown);
    const count = scoredCases.length || 1;

    const aggregateProfile = {
      logicalDeduction: Math.round(
        scoredCases.reduce((acc, s) => acc + s.lastScoreBreakdown.deductionScore, 0) / count,
      ),
      attentionToDetail: Math.round(
        scoredCases.reduce((acc, s) => acc + s.lastScoreBreakdown.attentionToDetailScore, 0) / count,
      ),
      evidenceEvaluation: Math.round(
        scoredCases.reduce((acc, s) => acc + s.lastScoreBreakdown.evidenceEvaluationScore, 0) / count,
      ),
      planning: Math.round(
        scoredCases.reduce((acc, s) => acc + s.lastScoreBreakdown.planningScore, 0) / count,
      ),
      timelineReasoning: Math.round(
        scoredCases.reduce((acc, s) => acc + s.lastScoreBreakdown.timelineReasoningScore, 0) / count,
      ),
      contradictionDetection: Math.round(
        scoredCases.reduce((acc, s) => acc + s.lastScoreBreakdown.contradictionDetectionScore, 0) / count,
      ),
      totalCasesCompleted: completedCaseSet.size,
    };

    const updatedProgress: MindGridUserProgress = {
      userId,
      completedCaseIds: Array.from(completedCaseSet),
      caseStats: updatedCaseStats,
      aggregateThinkingProfile: aggregateProfile,
      totalSolved: existing.totalSolved + (isNewlyCompleted ? 1 : 0),
      totalAttempted: existing.totalAttempted + 1,
      updatedAt: new Date().toISOString(),
    };

    await this.saveProgress(updatedProgress);
    return updatedProgress;
  }
}

export const mindGridProgressRepository = new FirestoreMindGridProgressRepository();

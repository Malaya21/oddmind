export type MindGridCaseDifficulty = "EASY" | "MEDIUM" | "HARD";

export type EvidenceType =
  | "DIRECT_EVIDENCE"
  | "TIMELINE"
  | "STATEMENT"
  | "ACCESS_LOG"
  | "CCTV"
  | "PHYSICAL_EVIDENCE"
  | "LOCATION"
  | "BEHAVIOR"
  | "CONTRADICTION";

export interface CaseSuspect {
  id: string;
  name: string;
  role: string;
  bio: string;
  initialStatement: string;
}

export interface CaseClue {
  id: string;
  text: string;
  category?: string;
}

export interface CaseEvidence {
  id: string;
  title: string;
  description: string;
  type: EvidenceType;
  unlockCost: number;
  linkedSuspectIds: string[];
  linkedTimelineEventIds: string[];
  isInitial?: boolean;
}

export interface PublicCaseEvidence {
  id: string;
  title: string;
  type: EvidenceType;
  unlockCost: number;
  linkedSuspectIds: string[];
  linkedTimelineEventIds: string[];
  isInitial?: boolean;
  description?: string; // Only populated if unlocked
  isUnlocked?: boolean;
}

export interface CaseTimelineEvent {
  id: string;
  timeLabel: string;
  minuteOffset: number;
  description: string;
  linkedSuspectIds: string[];
  isInitial?: boolean;
  unlockWithEvidenceId?: string;
}

export interface CaseSolution {
  culpritId: string;
  culpritName: string;
  requiredEvidenceIds: string[];
  primaryContradictionEvidenceIds: string[];
  expectedTimelineOrder: string[]; // Ordered array of timeline event IDs
  eliminatedSuspects: Record<string, { eliminatedByEvidenceId: string; reason: string }>;
  explanation: string;
}

export interface MindGridCase {
  id: string;
  caseNumber: number;
  title: string;
  difficulty: MindGridCaseDifficulty;
  scenario: string;
  summary: string;
  investigationPoints: number;
  suspects: CaseSuspect[];
  initialClues: CaseClue[];
  evidence: CaseEvidence[];
  timeline: CaseTimelineEvent[];
  solution: CaseSolution;
  scoring: {
    parDurationSec: number;
    maxScore: number;
  };
}

export interface MindGridPublicCase {
  id: string;
  caseNumber: number;
  title: string;
  difficulty: MindGridCaseDifficulty;
  scenario: string;
  summary: string;
  investigationPoints: number;
  suspects: CaseSuspect[];
  initialClues: CaseClue[];
  evidenceCatalog: PublicCaseEvidence[];
  timeline: CaseTimelineEvent[];
  scoring: {
    parDurationSec: number;
  };
}

export type MindGridSessionState = "INVESTIGATING" | "HYPOTHESIS_FORMED" | "SUBMITTED";

export interface MindGridHypothesis {
  suspectId: string;
  supportingEvidenceIds: string[];
  timelineOrder?: string[];
  notes?: string;
  updatedAt: string;
}

export interface MindGridAccusation {
  suspectId: string;
  reasoningEvidenceIds: string[];
  timelineOrder: string[];
  notes?: string;
}

export interface MindGridScoreBreakdown {
  overallScore: number; // 0 - 100
  deductionScore: number; // 0 - 100
  attentionToDetailScore: number; // 0 - 100
  evidenceEvaluationScore: number; // 0 - 100
  planningScore: number; // 0 - 100
  timelineReasoningScore: number; // 0 - 100
  contradictionDetectionScore: number; // 0 - 100
  timeBonus: number; // 0 - 100
  isCorrect: boolean;
}

export interface MindGridCaseResult {
  sessionId: string;
  caseId: string;
  userId: string;
  isSolved: boolean;
  score: MindGridScoreBreakdown;
  chosenCulpritId: string;
  correctCulpritId: string;
  correctCulpritName: string;
  explanation: string;
  eliminatedSuspects: Record<string, { eliminatedByEvidenceId: string; reason: string }>;
  keyEvidenceMissed: string[];
  contradictionsIdentified: string[];
  timelineCorrectCount: number;
  timelineTotalCount: number;
  submittedAt: string;
  durationSec: number;
}

export interface MindGridSession {
  sessionId: string;
  userId: string;
  caseId: string;
  state: MindGridSessionState;
  investigationPointsRemaining: number;
  unlockedEvidenceIds: string[];
  hypothesis: MindGridHypothesis | null;
  accusation: MindGridAccusation | null;
  startedAt: string;
  submittedAt: string | null;
  durationSec: number | null;
  result: MindGridCaseResult | null;
}

export interface MindGridUserProgress {
  userId: string;
  completedCaseIds: string[];
  caseStats: Record<
    string,
    {
      completed: boolean;
      bestScore: number;
      attempts: number;
      bestDurationSec: number;
      lastPlayedAt: string;
    }
  >;
  aggregateThinkingProfile: {
    logicalDeduction: number;
    attentionToDetail: number;
    evidenceEvaluation: number;
    planning: number;
    timelineReasoning: number;
    contradictionDetection: number;
    totalCasesCompleted: number;
  };
  totalSolved: number;
  totalAttempted: number;
  updatedAt: string;
}

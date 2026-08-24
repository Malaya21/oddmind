export type QuickChallengeCategory =
  | "CODE_BREAKER"
  | "PATTERN_LOGIC"
  | "SEQUENCE"
  | "OPTIMIZATION"
  | "LOGIC_DEDUCTION";

export type QuickChallengeDifficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";

export type QuickChallengeInputType = "TEXT" | "NUMBER" | "MULTIPLE_CHOICE";

export interface QuickChallengeOption {
  id: string;
  label: string;
  text: string;
}

export interface QuickChallengeSolution {
  acceptedAnswers: string[];
  explanation: string;
  reasoningSteps: string[];
}

export interface QuickChallenge {
  id: string;
  category: QuickChallengeCategory;
  difficulty: QuickChallengeDifficulty;
  title: string;
  prompt: string;
  instructions: string;
  clues: string[];
  inputType: QuickChallengeInputType;
  options?: QuickChallengeOption[];
  placeholder?: string;
  timeLimitSec: number;
  solution: QuickChallengeSolution;
}

export interface PublicQuickChallenge {
  id: string;
  category: QuickChallengeCategory;
  difficulty: QuickChallengeDifficulty;
  title: string;
  prompt: string;
  instructions: string;
  clues: string[];
  inputType: QuickChallengeInputType;
  options?: QuickChallengeOption[];
  placeholder?: string;
  timeLimitSec: number;
}

export type QuickChallengeSessionState = "IN_PROGRESS" | "SUBMITTED";

export interface QuickChallengeSession {
  sessionId: string;
  userId: string;
  challengeId: string;
  category: QuickChallengeCategory;
  difficulty: QuickChallengeDifficulty;
  state: QuickChallengeSessionState;
  userAnswer: string | null;
  isCorrect: boolean | null;
  score: number | null;
  startedAt: string;
  submittedAt: string | null;
  durationSec: number | null;
  explanation: string | null;
  correctAnswer: string | null;
}

export interface QuickPlayStepResult {
  challengeId: string;
  category: QuickChallengeCategory;
  difficulty: QuickChallengeDifficulty;
  userAnswer: string;
  isCorrect: boolean;
  durationSec: number;
  score: number;
  correctAnswer: string;
  explanation: string;
}

export interface QuickPlaySession {
  playId: string;
  userId: string;
  challengeIds: string[];
  currentStepIndex: number;
  stepResults: QuickPlayStepResult[];
  isCompleted: boolean;
  totalScore: number;
  totalDurationSec: number;
  startedAt: string;
  completedAt: string | null;
}

export interface QuickChallengeUserProgress {
  userId: string;
  completedChallengeIds: string[];
  categoryStats: Record<
    QuickChallengeCategory,
    {
      attempted: number;
      solved: number;
      bestScore: number;
      averageScore: number;
    }
  >;
  quickPlayStats: {
    played: number;
    bestScore: number;
    totalCorrect: number;
  };
  thinkingProfile: {
    logicalDeduction: number;
    patternRecognition: number;
    problemSolving: number;
    decisionMaking: number;
    attentionToDetail: number;
    planning: number;
    totalChallengesCompleted: number;
  };
  updatedAt: string;
}

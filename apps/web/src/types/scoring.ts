export const SCORING = {
  CORRECT_VOTE: 100,
  INCORRECT_VOTE: -30,
  ODD_SURVIVES: 120,
  ODD_CORRECT_GUESS: 150,
  SUCCESSFUL_DECEPTION: 50,
} as const;

export type ScoringRule = keyof typeof SCORING;

export interface ThinkingProfile {
  observation: number;
  decisionMaking: number;
  reasoning: number;
  adaptability: number;
  persuasion: number;
  deceptionDetection: number;
}

export interface PlayerRanking {
  uid: string;
  displayName: string;
  totalScore: number;
  rank: number;
}

export interface GameResult {
  gameId: string;
  roomCode: string;
  rankings: PlayerRanking[];
  thinkingProfiles: Record<string, ThinkingProfile>;
  completedAt: string;
}

export interface StatsDelta {
  gamesPlayed?: number;
  gamesWon?: number;
  totalScore?: number;
}

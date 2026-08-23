import type { GameResult, ThinkingProfile } from "@/types";

export interface ScoringService {
  buildGameResult(gameId: string): Promise<GameResult>;
  computeThinkingProfile(uid: string, gameId: string): Promise<ThinkingProfile>;
}

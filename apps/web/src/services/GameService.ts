import type {
  AdvancePhaseCommand,
  AdvancePhaseResult,
  ChatMessage,
  GameResult,
} from "@/types";

export interface GameService {
  /**
   * Idempotent phase advancement — callable by:
   * - MVP: client timer via POST /api/games/[gameId]/advance
   * - Future: Cloud Scheduler / cron hitting the same endpoint or an internal job runner
   *
   * When current phase !== expectedPhase, returns transitioned: false (no error).
   */
  advancePhase(command: AdvancePhaseCommand): Promise<AdvancePhaseResult>;

  startGame(roomId: string, hostUid: string): Promise<{ gameId: string }>;
  submitClue(gameId: string, uid: string, displayName: string, text: string): Promise<void>;
  submitVote(gameId: string, voterUid: string, targetUid: string): Promise<void>;
  sendMessage(gameId: string, uid: string, displayName: string, text: string): Promise<ChatMessage>;
  leaveGame(gameId: string, uid: string): Promise<void>;
  getGameResult(gameId: string): Promise<GameResult | null>;
}

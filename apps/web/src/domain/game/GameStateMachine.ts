import type { GamePhase } from "@/types/game";

/** Explicit allowed transitions for the game state machine. */
export const VALID_PHASE_TRANSITIONS: Readonly<
  Record<GamePhase, readonly GamePhase[]>
> = {
  LOBBY: ["STARTING"],
  STARTING: ["WORD_ASSIGNMENT"],
  WORD_ASSIGNMENT: ["CLUE_PHASE"],
  CLUE_PHASE: ["DISCUSSION_PHASE"],
  DISCUSSION_PHASE: ["VOTING_PHASE"],
  VOTING_PHASE: ["VOTE_REVEAL", "ELIMINATION"],
  VOTE_REVEAL: ["ELIMINATION", "FINAL_RESULT"],
  ELIMINATION: ["CLUE_PHASE", "FINAL_RESULT"],
  FINAL_RESULT: ["GAME_OVER"],
  GAME_OVER: [],
};

export function canTransition(from: GamePhase, to: GamePhase): boolean {
  return VALID_PHASE_TRANSITIONS[from].includes(to);
}

export function getAllowedNextPhases(phase: GamePhase): readonly GamePhase[] {
  return VALID_PHASE_TRANSITIONS[phase];
}

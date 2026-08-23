import type { RoomSettings } from "@/types/room";

export const GAME_PHASES = [
  "LOBBY",
  "STARTING",
  "WORD_ASSIGNMENT",
  "CLUE_PHASE",
  "DISCUSSION_PHASE",
  "VOTING_PHASE",
  "VOTE_REVEAL",
  "ELIMINATION",
  "FINAL_RESULT",
  "GAME_OVER",
] as const;

export type GamePhase = (typeof GAME_PHASES)[number];

export type PlayerRole = "NORMAL" | "ODD";

export type GameStatus = "ACTIVE" | "COMPLETED" | "ABANDONED";

export interface EliminationEvent {
  roundNumber: number;
  eliminatedUid: string;
  displayName: string;
  votesReceived: number;
  wasOddPlayer: boolean;
  timestamp: string;
}

export interface Game {
  id: string;
  roomId: string;
  roomCode: string;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  settings: RoomSettings;
  phaseStartedAt: string;
  phaseEndsAt: string;
  version: number;
  playerIds: string[];
  activePlayerIds: string[];
  eliminatedPlayerIds: string[];
  eliminationHistory: EliminationEvent[];
  winner?: "NORMAL" | "ODD";
  winReason?: string;
  scores: Record<string, number>;
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RoundSecrets {
  wordPairId: string;
  majorityWord: string;
  oddWord: string;
  oddPlayerUids: string[];
  roleAssignments: Record<string, PlayerRole>;
}

export interface GameSecrets {
  gameId: string;
  wordPairId: string;
  majorityWord: string;
  oddWord: string;
  oddPlayerUids: string[];
  roleAssignments: Record<string, PlayerRole>;
  rounds?: Record<number, RoundSecrets>;
}

export interface Clue {
  uid: string;
  displayName: string;
  text: string;
  submittedAt: string;
}

export interface Vote {
  voterUid: string;
  targetUid: string;
  submittedAt: string;
}

export interface VoteTally {
  counts: Record<string, number>;
  eliminatedUid?: string;
  tiedUids?: string[];
  wasOddPlayer?: boolean;
}

export interface Round {
  id: string;
  roundNumber: number;
  phase: GamePhase;
  clues: Record<string, Clue>;
  voteResults?: VoteTally;
  eliminatedPlayer?: EliminationEvent;
  completedAt?: string;
}

export interface PublicPlayer {
  uid: string;
  displayName: string;
  isActive: boolean;
  isEliminated: boolean;
  clueSubmitted: boolean;
  voteSubmitted: boolean;
}

export interface PlayerGameView {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  phaseEndsAt: string;
  scores: Record<string, number>;
  myRole?: PlayerRole;
  myWord?: string;
  isEliminated: boolean;
  activePlayerIds: string[];
  eliminatedPlayerIds: string[];
  eliminationHistory: EliminationEvent[];
  winner?: "NORMAL" | "ODD";
  winReason?: string;
  myClueSubmitted: boolean;
  myVoteSubmitted: boolean;
  clues: Clue[];
  players: PublicPlayer[];
  voteResults?: VoteTally;
  majorityWordRevealed?: string;
  oddWordRevealed?: string;
  oddPlayerUidRevealed?: string;
}

export interface ChatMessage {
  id: string;
  uid: string;
  displayName: string;
  text: string;
  createdAt: string;
  isSystem?: boolean;
}

export type PhaseAdvanceTrigger = "client" | "scheduler";

export interface AdvancePhaseCommand {
  gameId: string;
  expectedPhase: GamePhase;
  triggeredBy: PhaseAdvanceTrigger;
  triggeredAt: string;
  /** Present when triggeredBy is "client"; omitted for scheduler. */
  actorUid?: string;
}

export interface AdvancePhaseResult {
  game: Game;
  previousPhase: GamePhase;
  newPhase: GamePhase;
  /** False when the game was already past expectedPhase (idempotent no-op). */
  transitioned: boolean;
}

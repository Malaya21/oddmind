import type { ChatMessage, Clue, Round, Vote } from "@/types";

export interface RoundRepository {
  createRound(gameId: string, round: Round): Promise<void>;
  getRound(gameId: string, roundId: string): Promise<Round | null>;
  submitClue(gameId: string, roundId: string, clue: Clue): Promise<void>;
  submitVote(gameId: string, roundId: string, vote: Vote): Promise<void>;
  getVotes(gameId: string, roundId: string): Promise<Vote[]>;
  addMessage(
    gameId: string,
    roundId: string,
    message: ChatMessage,
  ): Promise<void>;
  getMessages(
    gameId: string,
    roundId: string,
    limit: number,
  ): Promise<ChatMessage[]>;
}

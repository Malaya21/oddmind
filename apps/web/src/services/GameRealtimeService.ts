import type {
  ChatMessage,
  Game,
  Room,
  RoomPlayer,
  Round,
} from "@/types";
import type { Unsubscribe } from "@/types/auth";

export interface GameRealtimeService {
  subscribeToRoom(
    roomId: string,
    callback: (room: Room, players: RoomPlayer[]) => void,
  ): Unsubscribe;
  subscribeToGame(gameId: string, callback: (game: Game) => void): Unsubscribe;
  subscribeToRound(
    gameId: string,
    roundId: string,
    callback: (round: Round) => void,
  ): Unsubscribe;
  subscribeToMessages(
    gameId: string,
    roundId: string,
    callback: (messages: ChatMessage[]) => void,
  ): Unsubscribe;
}

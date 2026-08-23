import type {
  Game,
  GameSecrets,
  PlayerGameView,
} from "@/types";

export interface GameRepository {
  createGame(game: Game): Promise<Game>;
  getGame(gameId: string): Promise<Game | null>;
  updateGame(
    gameId: string,
    patch: Partial<Game>,
    expectedVersion: number,
  ): Promise<Game>;
  getSecrets(gameId: string): Promise<GameSecrets | null>;
  writeSecrets(gameId: string, secrets: GameSecrets): Promise<void>;
  getPlayerView(gameId: string, uid: string): Promise<PlayerGameView>;
}

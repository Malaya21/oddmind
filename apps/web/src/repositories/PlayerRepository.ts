import type { Room, RoomPlayer } from "@/types";

export interface PlayerRepository {
  addPlayer(roomId: string, player: RoomPlayer): Promise<void>;
  removePlayer(roomId: string, uid: string): Promise<void>;
  getPlayers(roomId: string): Promise<RoomPlayer[]>;
  updatePlayer(
    roomId: string,
    uid: string,
    patch: Partial<RoomPlayer>,
  ): Promise<void>;
  isDisplayNameTaken(
    roomId: string,
    displayName: string,
    excludeUid?: string,
  ): Promise<boolean>;
  getActiveRoomForPlayer(uid: string): Promise<string | null>;
  joinLobby(room: Room, player: RoomPlayer): Promise<Room>;
  leaveLobby(roomId: string, uid: string): Promise<Room | null>;
}

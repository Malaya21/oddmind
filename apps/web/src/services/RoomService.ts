import type { CreateRoomInput, Room, RoomSettings } from "@/types";

export interface RoomService {
  createRoom(input: CreateRoomInput): Promise<Room>;
  joinRoom(roomCode: string, uid: string, displayName: string): Promise<Room>;
  leaveRoom(roomCode: string, uid: string): Promise<void>;
  closeRoom(roomCode: string, hostUid: string): Promise<Room>;
  updateSettings(
    roomId: string,
    hostUid: string,
    settings: Partial<RoomSettings>,
  ): Promise<Room>;
}

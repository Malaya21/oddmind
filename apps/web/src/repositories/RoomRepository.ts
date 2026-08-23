import type { CreateRoomInput, Room } from "@/types";

export interface RoomRepository {
  createRoom(input: CreateRoomInput): Promise<Room>;
  getRoomById(roomId: string): Promise<Room | null>;
  getRoomByCode(roomCode: string): Promise<Room | null>;
  updateRoom(
    roomId: string,
    patch: Partial<Room>,
    expectedVersion?: number,
  ): Promise<Room>;
  deleteRoom(roomId: string): Promise<void>;
  reserveRoomCode(code: string, roomId: string): Promise<boolean>;
  releaseRoomCode(code: string): Promise<void>;
}

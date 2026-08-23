import type { RoomPlayer } from "@/types/player";

export type RoomStatus =
  | "LOBBY"
  | "STARTING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type OddPlayerMode = "AUTOMATIC" | "ONE" | "TWO";

export interface RoomSettings {
  minPlayers: number;
  maxPlayers: number;
  rounds: number;
  clueDurationSec: number;
  discussionDurationSec: number;
  votingDurationSec: number;
  oddPlayerMode: OddPlayerMode;
  oddPlayerCount?: number;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  minPlayers: 4,
  maxPlayers: 12,
  rounds: 5,
  clueDurationSec: 45,
  discussionDurationSec: 60,
  votingDurationSec: 20,
  oddPlayerMode: "AUTOMATIC",
};

export interface Room {
  id: string;
  roomCode: string;
  hostUid: string;
  status: RoomStatus;
  settings: RoomSettings;
  gameId?: string;
  playerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomInput {
  hostUid: string;
  hostDisplayName: string;
  settings?: RoomSettings;
}

export interface RoomSnapshot {
  room: Room;
  players: RoomPlayer[];
}

import {
  type CreateRoomInput,
  type Room,
  type RoomPlayer,
  type RoomSettings,
  DEFAULT_ROOM_SETTINGS,
} from "@/types";
import type { PlayerRepository } from "@/repositories/PlayerRepository";
import type { RoomRepository } from "@/repositories/RoomRepository";
import type { RoomService } from "@/services/RoomService";
import { validateDisplayName } from "@/domain/player/DisplayNameValidator";
import { validateRoomSettings } from "@/domain/room/RoomSettingsValidator";
import { normalizeRoomCode, isValidRoomCode } from "@/lib/room-code";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";

export class RoomServiceImpl implements RoomService {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly playerRepository: PlayerRepository,
  ) {}

  async createRoom(input: CreateRoomInput): Promise<Room> {
    const hostDisplayName = validateDisplayName(input.hostDisplayName);
    const settings = validateRoomSettings({
      ...DEFAULT_ROOM_SETTINGS,
      ...input.settings,
    });

    const activeRoomId = await this.playerRepository.getActiveRoomForPlayer(
      input.hostUid,
    );
    if (activeRoomId) {
      throw new ConflictError(
        "PLAYER_ALREADY_IN_ACTIVE_ROOM",
        "You are already in an active room.",
      );
    }

    return this.roomRepository.createRoom({
      hostUid: input.hostUid,
      hostDisplayName,
      settings,
    });
  }

  async joinRoom(
    roomCode: string,
    uid: string,
    displayName: string,
  ): Promise<Room> {
    const normalizedCode = normalizeRoomCode(roomCode);
    if (!isValidRoomCode(normalizedCode)) {
      throw new ValidationError(
        "INVALID_ROOM_CODE",
        "Enter a valid room code.",
      );
    }

    const validDisplayName = validateDisplayName(displayName);
    const room = await this.roomRepository.getRoomByCode(normalizedCode);
    if (!room) {
      throw new NotFoundError("ROOM_NOT_FOUND", "Room not found.");
    }

    if (room.status !== "LOBBY") {
      throw new ConflictError(
        "ROOM_NOT_ACCEPTING_PLAYERS",
        "This room is no longer accepting players.",
      );
    }

    const activeRoomId = await this.playerRepository.getActiveRoomForPlayer(uid);
    if (activeRoomId && activeRoomId !== room.id) {
      throw new ConflictError(
        "PLAYER_ALREADY_IN_ACTIVE_ROOM",
        "Leave your current room before joining another.",
      );
    }

    const now = new Date().toISOString();
    const player: RoomPlayer = {
      uid,
      displayName: validDisplayName,
      isHost: false,
      joinedAt: now,
      connectionStatus: "connected",
      lastSeenAt: now,
      active: true,
    };

    return this.playerRepository.joinLobby(room, player);
  }

  async leaveRoom(roomCode: string, uid: string): Promise<void> {
    const normalizedCode = normalizeRoomCode(roomCode);
    if (!isValidRoomCode(normalizedCode)) {
      throw new ValidationError(
        "INVALID_ROOM_CODE",
        "Enter a valid room code.",
      );
    }

    const room = await this.roomRepository.getRoomByCode(normalizedCode);
    if (!room) {
      return;
    }

    await this.playerRepository.leaveLobby(room.id, uid);
  }

  async updateSettings(
    roomId: string,
    hostUid: string,
    settings: Partial<RoomSettings>,
  ): Promise<Room> {
    const room = await this.roomRepository.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("ROOM_NOT_FOUND", "Room not found.");
    }

    if (room.hostUid !== hostUid) {
      throw new UnauthorizedError(
        "ONLY_HOST_CAN_UPDATE_SETTINGS",
        "Only the host can update room settings.",
      );
    }

    if (room.status !== "LOBBY") {
      throw new ConflictError(
        "ROOM_SETTINGS_LOCKED",
        "Room settings can only be changed in the lobby.",
      );
    }

    const validated = validateRoomSettings({
      ...room.settings,
      ...settings,
    });

    if (validated.maxPlayers < room.playerCount) {
      throw new ValidationError(
        "MAX_PLAYERS_BELOW_CURRENT_COUNT",
        "Maximum players cannot be lower than the current player count.",
      );
    }

    return this.roomRepository.updateRoom(room.id, {
      settings: validated,
      updatedAt: new Date().toISOString(),
    });
  }

  async closeRoom(roomCode: string, hostUid: string): Promise<Room> {
    if (!isValidRoomCode(roomCode)) {
      throw new ValidationError("INVALID_ROOM_CODE", "Invalid room code format.");
    }
    const normalized = normalizeRoomCode(roomCode);
    const room = await this.roomRepository.getRoomByCode(normalized);
    if (!room) {
      throw new NotFoundError("ROOM_NOT_FOUND", "Room not found.");
    }

    if (room.hostUid !== hostUid) {
      throw new UnauthorizedError(
        "ONLY_HOST_CAN_CLOSE_ROOM",
        "Only the host can close the room.",
      );
    }

    const updated = await this.roomRepository.updateRoom(room.id, {
      status: "CANCELLED",
      updatedAt: new Date().toISOString(),
    });

    await this.roomRepository.releaseRoomCode(normalized);
    return updated;
  }
}


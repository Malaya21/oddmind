import type { GameRepository } from "@/repositories/GameRepository";
import type { PlayerRepository } from "@/repositories/PlayerRepository";
import type { RoomRepository } from "@/repositories/RoomRepository";
import type { RoundRepository } from "@/repositories/RoundRepository";
import type { WordPairRepository } from "@/repositories/WordPairRepository";
import type {
  ChatMessage,
  Clue,
  CreateRoomInput,
  Game,
  GameSecrets,
  PlayerGameView,
  Room,
  RoomPlayer,
  Round,
  Vote,
  WordPair,
  WordPairQueryOptions,
} from "@/types";
import type { StatsDelta } from "@/types/scoring";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  ConflictError,
  NotFoundError,
  NotImplementedError,
} from "@/lib/errors";
import { generateRoomCode } from "@/lib/room-code";
import {
  getRandomWordPair,
  getWordPairById,
  getWordDistractors,
} from "@/domain/content/WordPairCatalog";

function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }
  if (typeof data === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        clean[key] = sanitizeFirestoreData(value);
      }
    }
    return clean as T;
  }
  return data;
}

function notImplemented(name: string): never {
  throw new NotImplementedError(`${name} will be implemented in a later phase.`);
}

export class FirestoreRoomRepository implements RoomRepository {
  async createRoom(input: CreateRoomInput): Promise<Room> {
    const db = getAdminFirestore();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const roomCode = generateRoomCode();
      const roomRef = db.collection("rooms").doc();
      const codeRef = db.collection("roomCodes").doc(roomCode);
      const hostRef = roomRef.collection("players").doc(input.hostUid);
      const membershipRef = db
        .collection("activeRoomMemberships")
        .doc(input.hostUid);
      const now = new Date().toISOString();

      try {
        return await db.runTransaction(async (transaction) => {
          const [codeDoc, membershipDoc] = await Promise.all([
            transaction.get(codeRef),
            transaction.get(membershipRef),
          ]);

          if (codeDoc.exists) {
            throw new ConflictError(
              "ROOM_CODE_ALREADY_EXISTS",
              "Generated room code already exists.",
            );
          }

          if (membershipDoc.exists) {
            const oldRoomId = membershipDoc.get("roomId") as string | undefined;
            if (oldRoomId && oldRoomId !== roomRef.id) {
              const oldRoomRef = db.collection("rooms").doc(oldRoomId);
              const oldPlayerRef = oldRoomRef.collection("players").doc(input.hostUid);
              transaction.delete(oldPlayerRef);
            }
          }

          const room: Room = {
            id: roomRef.id,
            roomCode,
            hostUid: input.hostUid,
            status: "LOBBY",
            settings: input.settings!,
            playerCount: 1,
            createdAt: now,
            updatedAt: now,
          };

          transaction.set(codeRef, {
            roomId: room.id,
            createdAt: now,
          });
          transaction.set(roomRef, room);
          transaction.set(hostRef, {
            uid: input.hostUid,
            displayName: input.hostDisplayName,
            isHost: true,
            joinedAt: now,
            connectionStatus: "connected",
            lastSeenAt: now,
            active: true,
          });
          transaction.set(membershipRef, {
            roomId: room.id,
            roomCode,
            joinedAt: now,
          });

          return room;
        });
      } catch (error) {
        if (
          error instanceof ConflictError &&
          error.code === "ROOM_CODE_ALREADY_EXISTS"
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictError(
      "ROOM_CODE_GENERATION_FAILED",
      "Could not generate a unique room code.",
    );
  }

  async getRoomById(roomId: string): Promise<Room | null> {
    const snapshot = await getAdminFirestore().collection("rooms").doc(roomId).get();
    return snapshot.exists ? (snapshot.data() as Room) : null;
  }

  async getRoomByCode(roomCode: string): Promise<Room | null> {
    const db = getAdminFirestore();
    const codeDoc = await db.collection("roomCodes").doc(roomCode).get();
    if (!codeDoc.exists) {
      return null;
    }
    const roomId = codeDoc.get("roomId") as string | undefined;
    if (!roomId) {
      return null;
    }
    return this.getRoomById(roomId);
  }

  async updateRoom(
    roomId: string,
    patch: Partial<Room>,
    _expectedVersion?: number,
  ): Promise<Room> {
    const roomRef = getAdminFirestore().collection("rooms").doc(roomId);
    await roomRef.update(patch);
    const snapshot = await roomRef.get();
    if (!snapshot.exists) {
      throw new NotFoundError("ROOM_NOT_FOUND", "Room not found.");
    }
    return snapshot.data() as Room;
  }

  async deleteRoom(roomId: string): Promise<void> {
    await getAdminFirestore().collection("rooms").doc(roomId).delete();
  }

  async reserveRoomCode(code: string, roomId: string): Promise<boolean> {
    const ref = getAdminFirestore().collection("roomCodes").doc(code);
    try {
      await ref.create({ roomId, createdAt: new Date().toISOString() });
      return true;
    } catch {
      return false;
    }
  }

  async releaseRoomCode(code: string): Promise<void> {
    await getAdminFirestore().collection("roomCodes").doc(code).delete();
  }
}

export class FirestorePlayerRepository implements PlayerRepository {
  async addPlayer(roomId: string, player: RoomPlayer): Promise<void> {
    await getAdminFirestore()
      .collection("rooms")
      .doc(roomId)
      .collection("players")
      .doc(player.uid)
      .set(player);
  }

  async removePlayer(roomId: string, uid: string): Promise<void> {
    await getAdminFirestore()
      .collection("rooms")
      .doc(roomId)
      .collection("players")
      .doc(uid)
      .delete();
  }

  async getPlayers(roomId: string): Promise<RoomPlayer[]> {
    const snapshot = await getAdminFirestore()
      .collection("rooms")
      .doc(roomId)
      .collection("players")
      .get();

    return snapshot.docs
      .map((doc) => doc.data() as RoomPlayer)
      .filter((player) => player.active !== false)
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  }

  async updatePlayer(
    roomId: string,
    uid: string,
    patch: Partial<RoomPlayer>,
  ): Promise<void> {
    await getAdminFirestore()
      .collection("rooms")
      .doc(roomId)
      .collection("players")
      .doc(uid)
      .update(patch);
  }

  async isDisplayNameTaken(
    roomId: string,
    displayName: string,
    excludeUid?: string,
  ): Promise<boolean> {
    const players = await this.getPlayers(roomId);
    const normalized = displayName.toLowerCase();
    return players.some(
      (player) =>
        player.uid !== excludeUid &&
        player.displayName.toLowerCase() === normalized,
    );
  }

  async getActiveRoomForPlayer(uid: string): Promise<string | null> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection("activeRoomMemberships")
      .doc(uid)
      .get();
    if (!snapshot.exists) {
      return null;
    }
    const roomId = snapshot.get("roomId") as string | undefined;
    if (!roomId) {
      await db.collection("activeRoomMemberships").doc(uid).delete();
      return null;
    }

    const roomDoc = await db.collection("rooms").doc(roomId).get();
    if (!roomDoc.exists) {
      await db.collection("activeRoomMemberships").doc(uid).delete();
      return null;
    }

    const roomStatus = roomDoc.get("status") as string;
    if (roomStatus !== "LOBBY" && roomStatus !== "IN_PROGRESS") {
      await db.collection("activeRoomMemberships").doc(uid).delete();
      return null;
    }

    return roomId;
  }

  async joinLobby(room: Room, player: RoomPlayer): Promise<Room> {
    const db = getAdminFirestore();
    const roomRef = db.collection("rooms").doc(room.id);
    const playerRef = roomRef.collection("players").doc(player.uid);
    const membershipRef = db.collection("activeRoomMemberships").doc(player.uid);

    return db.runTransaction(async (transaction) => {
      const [roomDoc, membershipDoc, playerDoc, playersSnapshot] =
        await Promise.all([
          transaction.get(roomRef),
          transaction.get(membershipRef),
          transaction.get(playerRef),
          transaction.get(roomRef.collection("players")),
        ]);

      if (!roomDoc.exists) {
        throw new NotFoundError("ROOM_NOT_FOUND", "Room not found.");
      }

      const currentRoom = roomDoc.data() as Room;
      if (currentRoom.status !== "LOBBY") {
        throw new ConflictError(
          "ROOM_NOT_ACCEPTING_PLAYERS",
          "This room is no longer accepting players.",
        );
      }

      if (playerDoc.exists && playerDoc.get("active") === true) {
        return currentRoom;
      }

      if (currentRoom.playerCount >= currentRoom.settings.maxPlayers) {
        throw new ConflictError("ROOM_FULL", "This room is full.");
      }

      const normalizedDisplayName = player.displayName.toLowerCase();
      const duplicateName = playersSnapshot.docs.some((doc) => {
        const existing = doc.data() as RoomPlayer;
        return (
          existing.active !== false &&
          existing.uid !== player.uid &&
          existing.displayName.toLowerCase() === normalizedDisplayName
        );
      });

      if (duplicateName) {
        throw new ConflictError(
          "DISPLAY_NAME_TAKEN",
          "That display name is already in use in this room.",
        );
      }

      if (membershipDoc.exists) {
        const oldRoomId = membershipDoc.get("roomId") as string | undefined;
        if (oldRoomId && oldRoomId !== room.id) {
          const oldRoomRef = db.collection("rooms").doc(oldRoomId);
          const oldPlayerRef = oldRoomRef.collection("players").doc(player.uid);
          transaction.delete(oldPlayerRef);
        }
      }

      const now = new Date().toISOString();
      const updatedRoom: Room = {
        ...currentRoom,
        playerCount: currentRoom.playerCount + 1,
        updatedAt: now,
      };

      transaction.set(playerRef, {
        ...player,
        isHost: false,
        active: true,
        lastSeenAt: now,
      });
      transaction.set(membershipRef, {
        roomId: currentRoom.id,
        roomCode: currentRoom.roomCode,
        joinedAt: player.joinedAt,
      });
      transaction.update(roomRef, {
        playerCount: updatedRoom.playerCount,
        updatedAt: now,
      });

      return updatedRoom;
    });
  }

  async leaveLobby(roomId: string, uid: string): Promise<Room | null> {
    const db = getAdminFirestore();
    const roomRef = db.collection("rooms").doc(roomId);
    const playerRef = roomRef.collection("players").doc(uid);
    const membershipRef = db.collection("activeRoomMemberships").doc(uid);

    return db.runTransaction(async (transaction) => {
      const [roomDoc, playerDoc, playersSnapshot] = await Promise.all([
        transaction.get(roomRef),
        transaction.get(playerRef),
        transaction.get(roomRef.collection("players")),
      ]);

      if (!roomDoc.exists) {
        transaction.delete(membershipRef);
        return null;
      }

      const room = roomDoc.data() as Room;
      if (!playerDoc.exists || playerDoc.get("active") !== true) {
        transaction.delete(membershipRef);
        return room;
      }

      const activePlayers = playersSnapshot.docs
        .map((doc) => doc.data() as RoomPlayer)
        .filter((player) => player.active !== false)
        .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
      const remainingPlayers = activePlayers.filter((player) => player.uid !== uid);
      const now = new Date().toISOString();
      const patch: Partial<Room> = {
        playerCount: remainingPlayers.length,
        updatedAt: now,
      };

      transaction.delete(playerRef);
      transaction.delete(membershipRef);

      if (room.hostUid === uid) {
        const nextHost = remainingPlayers[0];
        if (nextHost) {
          patch.hostUid = nextHost.uid;
          transaction.update(
            roomRef.collection("players").doc(nextHost.uid),
            { isHost: true, lastSeenAt: now },
          );
        } else {
          patch.status = "CANCELLED";
          transaction.delete(db.collection("roomCodes").doc(room.roomCode));
        }
      } else if (remainingPlayers.length === 0) {
        patch.status = "CANCELLED";
        transaction.delete(db.collection("roomCodes").doc(room.roomCode));
      }

      transaction.update(roomRef, patch);

      return {
        ...room,
        ...patch,
      };
    });
  }
}

export class FirestoreGameRepository implements GameRepository {
  async createGame(game: Game): Promise<Game> {
    const db = getAdminFirestore();
    const batch = db.batch();
    const gameRef = db.collection("games").doc(game.id);
    batch.set(gameRef, game);

    for (const uid of game.playerIds) {
      const playerDocRef = gameRef.collection("players").doc(uid);
      batch.set(playerDocRef, {
        uid,
        joinedAt: game.createdAt,
      });
    }

    await batch.commit();
    return game;
  }

  async getGame(gameId: string): Promise<Game | null> {
    const snapshot = await getAdminFirestore().collection("games").doc(gameId).get();
    return snapshot.exists ? (snapshot.data() as Game) : null;
  }

  async updateGame(
    gameId: string,
    patch: Partial<Game>,
    _expectedVersion?: number,
  ): Promise<Game> {
    const db = getAdminFirestore();
    const gameRef = db.collection("games").doc(gameId);
    const now = new Date().toISOString();
    const cleanPatch: Record<string, unknown> = { updatedAt: now };
    for (const [key, val] of Object.entries(patch)) {
      if (val !== undefined) {
        cleanPatch[key] = val;
      }
    }
    await gameRef.update(cleanPatch);
    const snapshot = await gameRef.get();
    if (!snapshot.exists) {
      throw new NotFoundError("GAME_NOT_FOUND", "Game not found.");
    }
    return snapshot.data() as Game;
  }

  async getSecrets(gameId: string): Promise<GameSecrets | null> {
    const snapshot = await getAdminFirestore()
      .collection("games")
      .doc(gameId)
      .collection("secrets")
      .doc("all")
      .get();
    return snapshot.exists ? (snapshot.data() as GameSecrets) : null;
  }

  async writeSecrets(gameId: string, secrets: GameSecrets): Promise<void> {
    await getAdminFirestore()
      .collection("games")
      .doc(gameId)
      .collection("secrets")
      .doc("all")
      .set(sanitizeFirestoreData(secrets));
  }

  async getPlayerView(gameId: string, uid: string): Promise<PlayerGameView> {
    const db = getAdminFirestore();
    const game = await this.getGame(gameId);
    if (!game) {
      throw new NotFoundError("GAME_NOT_FOUND", "Game not found.");
    }

    if (!game.playerIds.includes(uid)) {
      throw new ConflictError("NOT_GAME_PLAYER", "You are not a player in this game.");
    }

    const [secrets, roundSnapshot, roomPlayersSnapshot] = await Promise.all([
      this.getSecrets(gameId),
      db
        .collection("games")
        .doc(gameId)
        .collection("rounds")
        .doc(`round_${game.currentRound}`)
        .get(),
      db.collection("rooms").doc(game.roomId).collection("players").get(),
    ]);

    const round = roundSnapshot.exists ? (roundSnapshot.data() as Round) : null;

    const myRole = secrets?.roleAssignments[uid];
    const myWord =
      myRole === "ODD" ? secrets?.oddWord : secrets?.majorityWord;

    const roomPlayers = roomPlayersSnapshot.docs.map(
      (doc) => doc.data() as RoomPlayer,
    );

    const isMatchEnded =
      game.phase === "FINAL_RESULT" || game.phase === "GAME_OVER";

    const publicPlayers = game.playerIds.map((playerId) => {
      const playerProfile = roomPlayers.find((p) => p.uid === playerId);
      return {
        uid: playerId,
        displayName: playerProfile?.displayName ?? "Player",
        isActive: game.activePlayerIds.includes(playerId),
        isEliminated: game.eliminatedPlayerIds.includes(playerId),
        clueSubmitted: Boolean(round?.clues?.[playerId]),
        voteSubmitted: false,
      };
    });

    const clues = Object.values(round?.clues ?? {});

    return {
      phase: game.phase,
      currentRound: game.currentRound,
      totalRounds: game.totalRounds,
      phaseEndsAt: game.phaseEndsAt,
      scores: game.scores,
      myRole,
      myWord,
      isEliminated: game.eliminatedPlayerIds.includes(uid),
      activePlayerIds: game.activePlayerIds,
      eliminatedPlayerIds: game.eliminatedPlayerIds,
      eliminationHistory: game.eliminationHistory ?? [],
      winner: game.winner,
      winReason: game.winReason,
      myClueSubmitted: Boolean(round?.clues?.[uid]),
      myVoteSubmitted: false,
      clues,
      players: publicPlayers,
      voteResults: round?.voteResults,
      majorityWordRevealed: isMatchEnded ? secrets?.majorityWord : undefined,
      oddWordRevealed: isMatchEnded ? secrets?.oddWord : undefined,
      oddPlayerUidRevealed: isMatchEnded ? secrets?.oddPlayerUids?.[0] : undefined,
    };
  }
}

export class FirestoreRoundRepository implements RoundRepository {
  async createRound(gameId: string, round: Round): Promise<void> {
    await getAdminFirestore()
      .collection("games")
      .doc(gameId)
      .collection("rounds")
      .doc(round.id)
      .set(sanitizeFirestoreData(round));
  }

  async getRound(gameId: string, roundId: string): Promise<Round | null> {
    const snapshot = await getAdminFirestore()
      .collection("games")
      .doc(gameId)
      .collection("rounds")
      .doc(roundId)
      .get();
    return snapshot.exists ? (snapshot.data() as Round) : null;
  }

  async submitClue(
    gameId: string,
    roundId: string,
    clue: Clue,
  ): Promise<void> {
    await getAdminFirestore()
      .collection("games")
      .doc(gameId)
      .collection("rounds")
      .doc(roundId)
      .update({
        [`clues.${clue.uid}`]: clue,
      });
  }

  async submitVote(
    gameId: string,
    roundId: string,
    vote: Vote,
  ): Promise<void> {
    await getAdminFirestore()
      .collection("games")
      .doc(gameId)
      .collection("rounds")
      .doc(roundId)
      .collection("votes")
      .doc(vote.voterUid)
      .set(vote);
  }

  async getVotes(gameId: string, roundId: string): Promise<Vote[]> {
    const snapshot = await getAdminFirestore()
      .collection("games")
      .doc(gameId)
      .collection("rounds")
      .doc(roundId)
      .collection("votes")
      .get();
    return snapshot.docs.map((doc) => doc.data() as Vote);
  }

  async addMessage(
    gameId: string,
    roundId: string,
    message: ChatMessage,
  ): Promise<void> {
    await getAdminFirestore()
      .collection("games")
      .doc(gameId)
      .collection("rounds")
      .doc(roundId)
      .collection("messages")
      .doc(message.id)
      .set(message);
  }

  async getMessages(
    gameId: string,
    roundId: string,
    limit: number,
  ): Promise<ChatMessage[]> {
    const snapshot = await getAdminFirestore()
      .collection("games")
      .doc(gameId)
      .collection("rounds")
      .doc(roundId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => doc.data() as ChatMessage);
  }
}

export class FirestoreWordPairRepository implements WordPairRepository {
  async getRandomPair(options?: WordPairQueryOptions): Promise<WordPair> {
    return getRandomWordPair(options?.excludeIds);
  }

  async getById(id: string): Promise<WordPair | null> {
    return getWordPairById(id);
  }

  async getDistractors(pair: WordPair, count: number): Promise<string[]> {
    return getWordDistractors(pair, count);
  }
}

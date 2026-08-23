"use client";

import type { GameRealtimeService } from "@/services/GameRealtimeService";
import { getFirebaseFirestore } from "@/infrastructure/firebase/client";
import type {
  ChatMessage,
  Game,
  Room,
  RoomPlayer,
  Round,
} from "@/types";
import type { Unsubscribe } from "@/types/auth";
import { NotImplementedError } from "@/lib/errors";
import {
  collection,
  doc,
  onSnapshot,
} from "firebase/firestore";

export class FirebaseGameRealtimeService implements GameRealtimeService {
  subscribeToRoom(
    roomId: string,
    callback: (room: Room, players: RoomPlayer[]) => void,
  ): Unsubscribe {
    const db = getFirebaseFirestore();
    let currentRoom: Room | null = null;
    let currentPlayers: RoomPlayer[] = [];

    function emit() {
      if (currentRoom) {
        callback(currentRoom, currentPlayers);
      }
    }

    const unsubscribeRoom = onSnapshot(
      doc(db, "rooms", roomId),
      (snapshot) => {
        currentRoom = snapshot.exists() ? (snapshot.data() as Room) : null;
        emit();
      },
      (error) => {
        console.warn("[realtime.subscribeToRoom error]", error.message);
      },
    );

    const playersQuery = collection(db, "rooms", roomId, "players");
    const unsubscribePlayers = onSnapshot(
      playersQuery,
      (snapshot) => {
        currentPlayers = snapshot.docs
          .map((playerDoc) => {
            return playerDoc.data() as RoomPlayer;
          })
          .filter((player) => player.active !== false)
          .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
        emit();
      },
      (error) => {
        console.warn("[realtime.subscribePlayers error]", error.message);
      },
    );

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
    };
  }

  subscribeToGame(
    gameId: string,
    callback: (game: Game) => void,
  ): Unsubscribe {
    const db = getFirebaseFirestore();
    return onSnapshot(
      doc(db, "games", gameId),
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as Game);
        }
      },
      (error) => {
        console.warn("[realtime.subscribeToGame error]", error.message);
      },
    );
  }

  subscribeToRound(
    _gameId: string,
    _roundId: string,
    _callback: (round: Round) => void,
  ): Unsubscribe {
    throw new NotImplementedError(
      "FirebaseGameRealtimeService.subscribeToRound will be implemented in Phase 7.",
    );
  }

  subscribeToMessages(
    gameId: string,
    roundId: string,
    callback: (messages: ChatMessage[]) => void,
  ): Unsubscribe {
    const db = getFirebaseFirestore();
    return onSnapshot(
      collection(db, "games", gameId, "rounds", roundId, "messages"),
      (snapshot) => {
        const messages = snapshot.docs
          .map((doc) => doc.data() as ChatMessage)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        callback(messages);
      },
      (error) => {
        console.warn("[realtime.subscribeToMessages error]", error.message);
      },
    );
  }
}

export function createFirebaseGameRealtimeService(): GameRealtimeService {
  return new FirebaseGameRealtimeService();
}

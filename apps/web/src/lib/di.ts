import type {
  GameRepository,
  PlayerRepository,
  RoomRepository,
  RoundRepository,
  UserRepository,
  WordPairRepository,
} from "@/repositories";
import {
  FirestoreGameRepository,
  FirestorePlayerRepository,
  FirestoreRoomRepository,
  FirestoreRoundRepository,
  FirestoreWordPairRepository,
} from "@/infrastructure/firebase/firestore/repositories";
import { FirestoreUserRepository } from "@/infrastructure/firebase/firestore/FirestoreUserRepository";
import { FirebasePresenceProvider } from "@/infrastructure/firebase/realtime/FirebasePresenceProvider";
import type { PresenceProvider } from "@/services/PresenceProvider";
import { GameServiceImpl } from "@/services/GameServiceImpl";
import type { GameService } from "@/services/GameService";
import { UserServiceImpl } from "@/services/UserService";
import type { UserService } from "@/services/UserService";
import { RoomServiceImpl } from "@/services/RoomServiceImpl";
import type { RoomService } from "@/services/RoomService";

export interface Repositories {
  userRepository: UserRepository;
  roomRepository: RoomRepository;
  playerRepository: PlayerRepository;
  gameRepository: GameRepository;
  roundRepository: RoundRepository;
  wordPairRepository: WordPairRepository;
  presenceProvider: PresenceProvider;
}

export interface Services {
  gameService: GameService;
  roomService: RoomService;
  userService: UserService;
}

let repositories: Repositories | undefined;
let services: Services | undefined;

export function createRepositories(): Repositories {
  repositories ??= {
    userRepository: new FirestoreUserRepository(),
    roomRepository: new FirestoreRoomRepository(),
    playerRepository: new FirestorePlayerRepository(),
    gameRepository: new FirestoreGameRepository(),
    roundRepository: new FirestoreRoundRepository(),
    wordPairRepository: new FirestoreWordPairRepository(),
    presenceProvider: new FirebasePresenceProvider(),
  };
  return repositories;
}

export function createServices(): Services {
  if (!services) {
    const repos = createRepositories();
    services = {
      gameService: new GameServiceImpl(
        repos.gameRepository,
        repos.roundRepository,
        repos.wordPairRepository,
        repos.roomRepository,
        repos.playerRepository,
      ),
      roomService: new RoomServiceImpl(
        repos.roomRepository,
        repos.playerRepository,
      ),
      userService: new UserServiceImpl(repos.userRepository),
    };
  }
  return services;
}

export function resetDependencyContainer(): void {
  repositories = undefined;
  services = undefined;
}

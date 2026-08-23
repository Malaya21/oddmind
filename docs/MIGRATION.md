# OddMind — Provider Migration Guide

This document maps Firebase-specific components to provider-independent interfaces so the core game can migrate to another backend without rewriting domain logic.

## Design principle

```text
GameService / RoomService
        ↓
Repository interfaces (domain types only)
        ↓
Firestore*Repository / Firebase*Provider  ← swappable
        ↓
Firebase SDK
```

Game rules, scoring, state transitions, and validators live in `src/domain/` and **must never import Firebase**.

---

## Authentication

| Firebase | Interface | Location |
|----------|-----------|----------|
| Anonymous Auth | `AuthProvider` | `src/services/AuthProvider.ts` |
| Client SDK | `FirebaseAuthProvider` | `src/infrastructure/firebase/auth/` |
| ID token verification | `verifyIdToken()` | `src/lib/auth/server.ts` |

### Future: Supabase / custom JWT

Implement `SupabaseAuthProvider` with the same `AuthProvider` interface. React features use `AuthContextProvider`, which accepts any `AuthProvider` implementation.

---

## Persistence (Firestore)

| Collection / path | Interface | Firebase implementation |
|-------------------|-----------|---------------------------|
| `users/{uid}` | `UserRepository` | `FirestoreUserRepository` |
| `rooms/{roomId}` | `RoomRepository` | `FirestoreRoomRepository` |
| `rooms/{roomId}/players/{uid}` | `PlayerRepository` | `FirestorePlayerRepository` |
| `games/{gameId}` | `GameRepository` | `FirestoreGameRepository` |
| `games/{gameId}/rounds/...` | `RoundRepository` | `FirestoreRoundRepository` |
| `wordPairs/{id}` | `WordPairRepository` | `FirestoreWordPairRepository` |

Factory: `createRepositories()` in `src/lib/di.ts`.

### Future: PostgreSQL / Supabase

| Interface | Postgres implementation |
|-----------|-------------------------|
| `RoomRepository` | `PostgresRoomRepository` |
| `GameRepository` | `PostgresGameRepository` |
| `PlayerRepository` | `PostgresPlayerRepository` |
| `RoundRepository` | `PostgresRoundRepository` |
| `UserRepository` | `PostgresUserRepository` |
| `WordPairRepository` | `PostgresWordPairRepository` (or static JSON + SQL seed) |

Suggested tables: `users`, `rooms`, `room_players`, `games`, `game_secrets`, `rounds`, `votes`, `clues`, `messages`, `game_results`, `word_pairs`.

Use transactions for race-sensitive operations (votes, room code reservation, phase advancement).

---

## Real-time

| Concern | Interface | Firebase implementation |
|---------|-----------|-------------------------|
| Game/room snapshots | `GameRealtimeService` | `FirebaseGameRealtimeService` |
| Presence / heartbeat | `PresenceProvider` | `FirebasePresenceProvider` |

Components and features subscribe through these services — not via direct `onSnapshot` calls.

### Future: WebSockets / Supabase Realtime

| Interface | Replacement |
|-----------|-------------|
| `GameRealtimeService` | `WebSocketGameRealtimeService` |
| `PresenceProvider` | `RedisPresenceProvider` or Supabase presence channel |

---

## Server-authoritative mutations

All game mutations go through Next.js API routes / Server Actions using **Firebase Admin SDK**:

| Route | Service method | Notes |
|-------|----------------|-------|
| `POST /api/games/[gameId]/advance` | `GameService.advancePhase` | Idempotent; client or scheduler |
| (Phase 4+) room create/join | `RoomService.*` | |
| (Phase 6+) start game | `GameService.startGame` | |
| (Phase 7+) clue, vote, chat | `GameService` / `RoundRepository` | |

### Phase advancement — client vs scheduler

```typescript
interface AdvancePhaseCommand {
  gameId: string;
  expectedPhase: GamePhase;
  triggeredBy: "client" | "scheduler";
  triggeredAt: string;
  actorUid?: string; // client only
}
```

- **MVP**: browser countdown expires → client POST with `triggeredBy: "client"` + Bearer token.
- **Future**: Cloud Scheduler POST with `triggeredBy: "scheduler"` + service secret; same `GameService.advancePhase`, same idempotent `transitioned: false` when already advanced.

Domain helper: `src/domain/game/PhaseAdvancement.ts`.

---

## Security rules

| Store | File | Role |
|-------|------|------|
| Firestore | `firestore.rules` | Deny client writes to authoritative fields |
| RTDB | `database.rules.json` | Presence self-write only |

When migrating off Firebase, replace rules with API authorization middleware and database row-level security (e.g. Postgres RLS).

---

## Environment variables

| Variable | Used by |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_*` | Client SDK |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Admin SDK |
| `SCHEDULER_API_SECRET` (future) | Scheduler-triggered advance |

See `.env.example`.

---

## Migration checklist

1. Implement new repository classes behind existing interfaces.
2. Point `createRepositories()` at new implementations (feature flag optional).
3. Run domain + service tests unchanged — they must pass without modification.
4. Dual-write `gameResults` during transition if needed.
5. Migrate presence last (lowest risk) or replace with WebSocket layer.
6. Decommission Firebase listeners once realtime adapter is swapped.

---

## What does NOT migrate

These remain unchanged when switching providers:

- `src/domain/**` — game engine, scoring, validators, state machine
- `src/services/GameService.ts` interface
- `src/types/**`
- UI components (except infrastructure hooks)

---

## Cost note

Firestore holds durable state; RTDB holds ephemeral presence. Do not duplicate the same fields in both stores. Timers use `phaseEndsAt` once per phase — never per-second writes.

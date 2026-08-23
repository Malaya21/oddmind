# OddMind

Real-time multiplayer social deduction game. Most players share a secret word; one or more players receive a related odd word. Clue, discuss, vote, deduce.

## Architecture

OddMind uses a **provider abstraction layer** so game logic stays independent of Firebase:

```text
UI → Server Actions / API Routes → Services → Domain Engine → Repository Interfaces → Firebase (initial)
```

- **Domain** (`src/domain/`): pure TypeScript — state machine, scoring rules, validators
- **Services** (`src/services/`): orchestration
- **Repositories** (`src/repositories/`): persistence interfaces
- **Infrastructure** (`src/infrastructure/firebase/`): Firebase implementations

See [docs/MIGRATION.md](./docs/MIGRATION.md) for provider mapping and future migration notes.

## Phase status

| Phase | Status |
|-------|--------|
| 1 Architecture | Complete |
| 2 Project Setup | Complete |
| 3 Authentication | Complete |
| 4 Room System | Pending |
| 5 Lobby | Pending |
| 6 Game Engine | Pending |
| 7 Gameplay | Pending |
| 8 Reliability | Pending |
| 9 Security | Pending |
| 10 Testing | Pending |
| 11 Deployment | Pending |

## Tech stack

- Next.js 16 (App Router), React, TypeScript (strict)
- Tailwind CSS v4, shadcn/ui
- Firebase Auth, Firestore, Realtime Database

## Getting started

### Prerequisites

- Node.js 20+
- Firebase project with Anonymous Auth, Firestore, and Realtime Database enabled

### Setup

```bash
# Install dependencies (from repo root)
npm install

# Copy environment template
cp .env.example apps/web/.env.local

# Fill in Firebase credentials in apps/web/.env.local
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## Project structure

```text
oddmind/
├── apps/web/                 # Next.js application
│   └── src/
│       ├── app/              # Routes & API handlers
│       ├── components/       # Shared UI
│       ├── features/         # Feature modules (auth, lobby, game, …)
│       ├── domain/           # Pure game logic
│       ├── repositories/     # Persistence interfaces
│       ├── services/         # Application services
│       └── infrastructure/   # Firebase adapters
├── docs/
├── firestore.rules
├── database.rules.json
└── firebase.json
```

## Phase advancement (MVP)

Clients trigger phase transitions when a countdown expires:

```text
POST /api/games/[gameId]/advance
{ "expectedPhase": "CLUE_PHASE", "triggeredBy": "client" }
```

The same idempotent `GameService.advancePhase` operation will later be callable by a **server-side scheduler** without changing the game engine.

## Data stores

| Store | Purpose |
|-------|---------|
| Firestore | Rooms, games, rounds, results, word pairs |
| Realtime Database | Presence / heartbeat only |
| Admin SDK | Authoritative mutations from API routes |

## License

Private — all rights reserved.

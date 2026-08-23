import type { ChatMessage, Room, RoomSettings, RoomSnapshot, User } from "@/types";
import { OddMindError } from "@/lib/errors";

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;

  const response = await fetch(path, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "Bypass-Tunnel-Reminder": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const body = (await response.json()) as { data: T } | ApiErrorBody;

  if (!response.ok) {
    const errorBody = body as ApiErrorBody;
    throw new OddMindError(
      errorBody.error?.code ?? "API_ERROR",
      errorBody.error?.message ?? "Request failed.",
      response.status,
    );
  }

  return (body as { data: T }).data;
}

export async function fetchCurrentUser(token: string): Promise<User> {
  return apiFetch<User>("/api/users/me", { token });
}

export async function updateCurrentUserDisplayName(
  token: string,
  displayName: string,
): Promise<User> {
  return apiFetch<User>("/api/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify({ displayName }),
  });
}

export async function regenerateCurrentUserDisplayName(
  token: string,
): Promise<User> {
  return apiFetch<User>("/api/users/me/regenerate-display-name", {
    method: "POST",
    token,
  });
}

export async function createRoom(
  token: string,
  settings: Partial<RoomSettings>,
): Promise<RoomSnapshot> {
  return apiFetch<RoomSnapshot>("/api/rooms", {
    method: "POST",
    token,
    body: JSON.stringify({ settings }),
  });
}

export async function joinRoom(
  token: string,
  roomCode: string,
): Promise<RoomSnapshot> {
  return apiFetch<RoomSnapshot>("/api/rooms/join", {
    method: "POST",
    token,
    body: JSON.stringify({ roomCode }),
  });
}

export async function fetchRoomSnapshot(
  token: string,
  roomCode: string,
): Promise<RoomSnapshot> {
  return apiFetch<RoomSnapshot>(`/api/rooms/${roomCode}`, { token });
}

export async function leaveRoom(token: string, roomCode: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/rooms/${roomCode}/leave`, {
    method: "POST",
    token,
  });
}

export async function closeRoom(token: string, roomCode: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/rooms/${roomCode}/close`, {
    method: "POST",
    token,
  });
}

export async function updateRoomSettings(
  token: string,
  roomCode: string,
  settings: Partial<RoomSettings>,
): Promise<Room> {
  return apiFetch<Room>(`/api/rooms/${roomCode}/settings`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ settings }),
  });
}

export async function startGame(
  token: string,
  roomCode: string,
): Promise<{ gameId: string }> {
  return apiFetch<{ gameId: string }>(`/api/rooms/${roomCode}/start`, {
    method: "POST",
    token,
  });
}

export async function fetchPlayerGameView(
  token: string,
  gameId: string,
): Promise<import("@/types").PlayerGameView> {
  return apiFetch<import("@/types").PlayerGameView>(`/api/games/${gameId}/view`, {
    token,
  });
}

export async function advanceGamePhase(
  token: string,
  gameId: string,
  expectedPhase: import("@/types").GamePhase,
): Promise<import("@/types").AdvancePhaseResult> {
  return apiFetch<import("@/types").AdvancePhaseResult>(
    `/api/games/${gameId}/advance`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ expectedPhase, triggeredBy: "client" }),
    },
  );
}

export async function submitClue(
  token: string,
  gameId: string,
  text: string,
): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/games/${gameId}/clue`, {
    method: "POST",
    token,
    body: JSON.stringify({ text }),
  });
}

export async function submitVote(
  token: string,
  gameId: string,
  targetUid: string,
): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/games/${gameId}/vote`, {
    method: "POST",
    token,
    body: JSON.stringify({ targetUid }),
  });
}

export async function submitOddGuess(
  token: string,
  gameId: string,
  guessWord: string,
): Promise<{ isCorrect: boolean }> {
  return apiFetch<{ isCorrect: boolean }>(`/api/games/${gameId}/guess`, {
    method: "POST",
    token,
    body: JSON.stringify({ guessWord }),
  });
}

export async function sendChatMessage(
  token: string,
  gameId: string,
  text: string,
): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/api/games/${gameId}/chat`, {
    method: "POST",
    token,
    body: JSON.stringify({ text }),
  });
}

export async function leaveGame(
  token: string,
  gameId: string,
): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/games/${gameId}/leave`, {
    method: "POST",
    token,
  });
}

export interface AdminStatusData {
  adminEmail: string;
  activeRoomsCount: number;
  activeGamesCount: number;
  activeMembershipsCount: number;
  totalRoomsCount: number;
  activeRooms: Room[];
}

export interface AdminPurgeResult {
  success: boolean;
  message: string;
  membershipsPurged: number;
  roomCodesPurged: number;
  roomsCancelled: number;
  gamesAbandoned: number;
}

export async function adminLogin(
  email: string,
  passcode: string,
): Promise<{ idToken: string; customToken: string; uid: string; email: string }> {
  return apiFetch<{ idToken: string; customToken: string; uid: string; email: string }>(
    "/api/admin/login",
    {
      method: "POST",
      body: JSON.stringify({ email, passcode }),
    },
  );
}

export async function adminGetStatus(token: string): Promise<AdminStatusData> {
  return apiFetch<AdminStatusData>("/api/admin/status", {
    method: "GET",
    token,
  });
}

export async function adminPurgeAll(token: string): Promise<AdminPurgeResult> {
  return apiFetch<AdminPurgeResult>("/api/admin/purge", {
    method: "POST",
    token,
  });
}

export interface AdminCleanDbResult {
  success: boolean;
  message: string;
  totalDeletedDocs: number;
  collectionsWiped: string[];
}

export async function adminCleanDb(token: string): Promise<AdminCleanDbResult> {
  return apiFetch<AdminCleanDbResult>("/api/admin/clean-db", {
    method: "POST",
    token,
  });
}



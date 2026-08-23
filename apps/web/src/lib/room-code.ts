import type { GamePhase, PhaseAdvanceTrigger } from "@/types/game";

export { generateDisplayName } from "@/domain/player/DisplayNameGenerator";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 5): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => {
    return ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
  }).join("");
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidRoomCode(code: string): boolean {
  const normalized = normalizeRoomCode(code);
  if (normalized.length < 4 || normalized.length > 6) {
    return false;
  }
  return /^[A-Z2-9]+$/.test(normalized);
}

export function createAdvancePhaseCommand(
  gameId: string,
  expectedPhase: GamePhase,
  triggeredBy: PhaseAdvanceTrigger,
  actorUid?: string,
) {
  return {
    gameId,
    expectedPhase,
    triggeredBy,
    triggeredAt: new Date().toISOString(),
    ...(actorUid ? { actorUid } : {}),
  };
}

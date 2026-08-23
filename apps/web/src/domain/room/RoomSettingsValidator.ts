import type { RoomSettings } from "@/types/room";
import { ValidationError } from "@/lib/errors";

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 12;

export const ROOM_SETTING_LIMITS = {
  minPlayers: { min: 4, max: 12 },
  maxPlayers: { min: 4, max: 12 },
  rounds: { min: 3, max: 10 },
  clueDurationSec: { min: 30, max: 120 },
  discussionDurationSec: { min: 30, max: 120 },
  votingDurationSec: { min: 15, max: 30 },
} as const;

function isInteger(value: number): boolean {
  return Number.isInteger(value);
}

export function validateRoomSettings(settings: RoomSettings): RoomSettings {
  if (
    !isInteger(settings.minPlayers) ||
    !isInteger(settings.maxPlayers) ||
    !isInteger(settings.rounds) ||
    !isInteger(settings.clueDurationSec) ||
    !isInteger(settings.discussionDurationSec) ||
    !isInteger(settings.votingDurationSec)
  ) {
    throw new ValidationError(
      "ROOM_SETTINGS_NOT_INTEGER",
      "Room settings must use whole numbers.",
    );
  }

  if (settings.minPlayers < MIN_PLAYERS || settings.minPlayers > MAX_PLAYERS) {
    throw new ValidationError(
      "INVALID_MIN_PLAYERS",
      `Minimum players must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}.`,
    );
  }

  if (settings.maxPlayers < MIN_PLAYERS || settings.maxPlayers > MAX_PLAYERS) {
    throw new ValidationError(
      "INVALID_MAX_PLAYERS",
      `Maximum players must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}.`,
    );
  }

  if (settings.maxPlayers < settings.minPlayers) {
    throw new ValidationError(
      "MAX_BELOW_MIN",
      "Maximum players cannot be lower than minimum players.",
    );
  }

  if (settings.rounds < 3 || settings.rounds > 10) {
    throw new ValidationError(
      "INVALID_ROUNDS",
      "Number of rounds must be between 3 and 10.",
    );
  }

  if (settings.clueDurationSec < 30 || settings.clueDurationSec > 120) {
    throw new ValidationError(
      "INVALID_CLUE_DURATION",
      "Clue duration must be between 30 and 120 seconds.",
    );
  }

  if (
    settings.discussionDurationSec < 30 ||
    settings.discussionDurationSec > 120
  ) {
    throw new ValidationError(
      "INVALID_DISCUSSION_DURATION",
      "Discussion duration must be between 30 and 120 seconds.",
    );
  }

  if (settings.votingDurationSec < 15 || settings.votingDurationSec > 30) {
    throw new ValidationError(
      "INVALID_VOTING_DURATION",
      "Voting duration must be between 15 and 30 seconds.",
    );
  }

  if (
    settings.oddPlayerMode !== "AUTOMATIC" &&
    settings.oddPlayerMode !== "ONE" &&
    settings.oddPlayerMode !== "TWO"
  ) {
    throw new ValidationError(
      "INVALID_ODD_PLAYER_MODE",
      "Odd Player mode must be Automatic, 1, or 2.",
    );
  }

  return settings;
}

export function computeAutomaticOddPlayerCount(playerCount: number): number {
  if (playerCount <= 8) {
    return 1;
  }
  return 2;
}

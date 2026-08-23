import { ValidationError } from "@/lib/errors";

const MIN_LENGTH = 3;
const MAX_LENGTH = 24;

const BLOCKED_NAMES = new Set([
  "admin",
  "moderator",
  "system",
  "null",
  "undefined",
  "anonymous",
]);

const DISPLAY_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9]*(?: [A-Za-z][A-Za-z0-9]*)?$/;

export function normalizeDisplayName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function validateDisplayName(input: string): string {
  const normalized = normalizeDisplayName(input);

  if (normalized.length < MIN_LENGTH) {
    throw new ValidationError(
      "DISPLAY_NAME_TOO_SHORT",
      `Display name must be at least ${MIN_LENGTH} characters.`,
    );
  }

  if (normalized.length > MAX_LENGTH) {
    throw new ValidationError(
      "DISPLAY_NAME_TOO_LONG",
      `Display name must be at most ${MAX_LENGTH} characters.`,
    );
  }

  if (!DISPLAY_NAME_PATTERN.test(normalized)) {
    throw new ValidationError(
      "DISPLAY_NAME_INVALID",
      "Display name may use letters, numbers, and one space (e.g. Blue Falcon).",
    );
  }

  if (BLOCKED_NAMES.has(normalized.toLowerCase())) {
    throw new ValidationError(
      "DISPLAY_NAME_BLOCKED",
      "That display name is not allowed.",
    );
  }

  return normalized;
}

export function isValidDisplayName(input: string): boolean {
  try {
    validateDisplayName(input);
    return true;
  } catch {
    return false;
  }
}

export function computePhaseEndAt(
  startedAt: Date,
  durationSec: number,
): Date {
  return new Date(startedAt.getTime() + durationSec * 1000);
}

export function getRemainingSeconds(
  phaseEndsAt: string | Date,
  now: Date = new Date(),
): number {
  const endMs =
    typeof phaseEndsAt === "string"
      ? new Date(phaseEndsAt).getTime()
      : phaseEndsAt.getTime();
  return Math.max(0, Math.ceil((endMs - now.getTime()) / 1000));
}

export function hasPhaseExpired(
  phaseEndsAt: string | Date,
  now: Date = new Date(),
  graceMs = 500,
): boolean {
  const endMs =
    typeof phaseEndsAt === "string"
      ? new Date(phaseEndsAt).getTime()
      : phaseEndsAt.getTime();
  return now.getTime() >= endMs - graceMs;
}

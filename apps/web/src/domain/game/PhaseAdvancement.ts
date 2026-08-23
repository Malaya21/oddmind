import type { AdvancePhaseCommand, AdvancePhaseResult, GamePhase } from "@/types/game";
import { canTransition } from "@/domain/game/GameStateMachine";
import { InvalidTransitionError } from "@/lib/errors";

/**
 * Validates an advance-phase command against the current phase.
 * Does not mutate state — persistence is handled by GameService + repositories.
 *
 * Idempotency: if the game has already moved past `expectedPhase`, callers should
 * treat the operation as a no-op (transitioned: false) rather than an error.
 * This allows both client timers and a future scheduler to safely retry.
 */
export function validatePhaseAdvance(
  currentPhase: GamePhase,
  command: AdvancePhaseCommand,
  nextPhase: GamePhase,
): void {
  if (currentPhase !== command.expectedPhase) {
    return;
  }

  if (!canTransition(currentPhase, nextPhase)) {
    throw new InvalidTransitionError(currentPhase, nextPhase);
  }
}

export function isPhaseAdvanceNoOp(
  currentPhase: GamePhase,
  expectedPhase: GamePhase,
): boolean {
  return currentPhase !== expectedPhase;
}

export type PhaseAdvanceResolver = (
  command: AdvancePhaseCommand,
  currentPhase: GamePhase,
) => GamePhase | null;

export interface PhaseAdvanceEvaluation {
  result: AdvancePhaseResult | null;
  nextPhase: GamePhase | null;
  noOp: boolean;
}

/**
 * Shared evaluation helper used by GameService.advancePhase.
 * Gameplay-specific branch selection (e.g. ODD_GUESS vs ROUND_RESULT) is
 * injected via resolveNextPhase so the engine stays provider-independent.
 */
export function evaluatePhaseAdvance(
  game: AdvancePhaseResult["game"],
  command: AdvancePhaseCommand,
  resolveNextPhase: PhaseAdvanceResolver,
): PhaseAdvanceEvaluation {
  if (isPhaseAdvanceNoOp(game.phase, command.expectedPhase)) {
    return {
      result: {
        game,
        previousPhase: game.phase,
        newPhase: game.phase,
        transitioned: false,
      },
      nextPhase: null,
      noOp: true,
    };
  }

  const nextPhase = resolveNextPhase(command, game.phase);
  if (!nextPhase) {
    return { result: null, nextPhase: null, noOp: false };
  }

  validatePhaseAdvance(game.phase, command, nextPhase);

  return {
    result: {
      game: { ...game, phase: nextPhase },
      previousPhase: game.phase,
      newPhase: nextPhase,
      transitioned: true,
    },
    nextPhase,
    noOp: false,
  };
}

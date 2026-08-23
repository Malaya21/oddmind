import { NextResponse, type NextRequest } from "next/server";
import type { GamePhase } from "@/types/game";
import { createServices } from "@/lib/di";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { logger } from "@/lib/logger";

interface AdvancePhaseBody {
  expectedPhase: GamePhase;
  triggeredBy?: "client" | "scheduler";
}

/**
 * Authoritative phase advancement endpoint.
 *
 * MVP: clients call this when a local countdown reaches zero.
 * Future: Cloud Scheduler can call the same endpoint with
 * triggeredBy: "scheduler" and a service token — no game engine changes.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await context.params;
    const body = (await request.json()) as AdvancePhaseBody;
    const triggeredBy = body.triggeredBy ?? "client";

    let actorUid: string | undefined;
    if (triggeredBy === "client") {
      const user = await verifyIdToken(request.headers.get("authorization"));
      actorUid = user.uid;
    } else {
      // Scheduler auth will be added in Phase 9 (service account / shared secret).
      logger.info("game.advance.scheduler_request", { gameId });
    }

    const { gameService } = createServices();
    const result = await gameService.advancePhase({
      gameId,
      expectedPhase: body.expectedPhase,
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      actorUid,
    });

    logger.info("game.advance.completed", {
      gameId,
      triggeredBy,
      transitioned: result.transitioned,
      newPhase: result.newPhase,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

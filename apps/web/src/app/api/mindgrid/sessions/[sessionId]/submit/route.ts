import { NextResponse, type NextRequest } from "next/server";
import { mindGridService } from "@/services/MindGridService";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { ValidationError } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const body = await request.json().catch(() => ({}));
    const { suspectId, reasoningEvidenceIds, timelineOrder, notes } = body;

    if (!suspectId || typeof suspectId !== "string") {
      throw new ValidationError("suspectId", "Suspect accusation is required.");
    }
    if (!Array.isArray(reasoningEvidenceIds)) {
      throw new ValidationError(
        "reasoningEvidenceIds",
        "Reasoning evidence selection is required.",
      );
    }
    if (!Array.isArray(timelineOrder)) {
      throw new ValidationError(
        "timelineOrder",
        "Timeline reconstruction order is required.",
      );
    }

    const { session, result, progress } = await mindGridService.submitAccusation(
      authUser.uid,
      sessionId,
      {
        suspectId,
        reasoningEvidenceIds,
        timelineOrder,
        notes,
      },
    );

    return NextResponse.json({
      data: {
        session,
        result,
        progress,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

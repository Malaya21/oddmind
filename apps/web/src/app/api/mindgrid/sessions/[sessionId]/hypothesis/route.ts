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
    const { suspectId, supportingEvidenceIds, timelineOrder, notes } = body;

    if (!suspectId || typeof suspectId !== "string") {
      throw new ValidationError("suspectId", "Valid suspectId is required.");
    }
    if (!Array.isArray(supportingEvidenceIds)) {
      throw new ValidationError("supportingEvidenceIds", "supportingEvidenceIds must be an array.");
    }

    const session = await mindGridService.saveHypothesis(authUser.uid, sessionId, {
      suspectId,
      supportingEvidenceIds,
      timelineOrder,
      notes,
    });

    return NextResponse.json({
      data: {
        session,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

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
    const { evidenceId } = body;

    if (!evidenceId || typeof evidenceId !== "string") {
      throw new ValidationError("evidenceId", "Valid evidenceId is required.");
    }

    const { session, unlockedEvidence, publicCase } =
      await mindGridService.unlockEvidence(authUser.uid, sessionId, evidenceId);

    return NextResponse.json({
      data: {
        session,
        unlockedEvidence,
        publicCase,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

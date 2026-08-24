import { NextResponse, type NextRequest } from "next/server";
import { mindGridService } from "@/services/MindGridService";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const body = await request.json().catch(() => ({}));
    const { caseId } = body;

    if (!caseId || typeof caseId !== "string") {
      throw new ValidationError("caseId", "Valid caseId is required.");
    }

    const { session, publicCase } = await mindGridService.startOrResumeSession(
      authUser.uid,
      caseId,
    );

    return NextResponse.json(
      {
        data: {
          session,
          publicCase,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

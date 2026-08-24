import { NextResponse, type NextRequest } from "next/server";
import { quickChallengeService } from "@/services/QuickChallengeService";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const body = await request.json().catch(() => ({}));
    const { challengeId } = body;

    if (!challengeId || typeof challengeId !== "string") {
      throw new ValidationError("challengeId", "Valid challengeId is required.");
    }

    const { session, publicChallenge } =
      await quickChallengeService.startOrResumeSession(authUser.uid, challengeId);

    return NextResponse.json(
      {
        data: {
          session,
          publicChallenge,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

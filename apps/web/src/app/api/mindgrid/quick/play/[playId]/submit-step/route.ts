import { NextResponse, type NextRequest } from "next/server";
import { quickChallengeService } from "@/services/QuickChallengeService";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { ValidationError } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ playId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { playId } = await params;
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const body = await request.json().catch(() => ({}));
    const { answer } = body;

    if (answer === undefined || answer === null || typeof answer !== "string") {
      throw new ValidationError("answer", "Answer is required.");
    }

    const { quickPlay, stepResult, nextPublicChallenge, progress } =
      await quickChallengeService.submitQuickPlayStep(
        authUser.uid,
        playId,
        answer,
      );

    return NextResponse.json({
      data: {
        quickPlay,
        stepResult,
        nextPublicChallenge,
        progress,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

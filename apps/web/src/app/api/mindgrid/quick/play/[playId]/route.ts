import { NextResponse, type NextRequest } from "next/server";
import { quickChallengeService } from "@/services/QuickChallengeService";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ playId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { playId } = await params;
    const authUser = await verifyIdToken(request.headers.get("authorization"));

    const { quickPlay, currentPublicChallenge } =
      await quickChallengeService.getQuickPlaySession(authUser.uid, playId);

    return NextResponse.json({
      data: {
        quickPlay,
        currentPublicChallenge,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { quickChallengeService } from "@/services/QuickChallengeService";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));

    const { quickPlay, currentPublicChallenge } =
      await quickChallengeService.startQuickPlay(authUser.uid);

    return NextResponse.json(
      {
        data: {
          quickPlay,
          currentPublicChallenge,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

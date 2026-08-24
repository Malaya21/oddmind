import { NextResponse, type NextRequest } from "next/server";
import { quickChallengeService } from "@/services/QuickChallengeService";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const authUser = await verifyIdToken(request.headers.get("authorization"));

    const { session, publicChallenge } =
      await quickChallengeService.getSessionState(authUser.uid, sessionId);

    return NextResponse.json({
      data: {
        session,
        publicChallenge,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

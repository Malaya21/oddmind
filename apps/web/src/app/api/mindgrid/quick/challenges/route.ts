import { NextResponse, type NextRequest } from "next/server";
import { quickChallengeService } from "@/services/QuickChallengeService";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";

export async function GET(request: NextRequest) {
  try {
    let uid: string | undefined;
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      try {
        const authUser = await verifyIdToken(authHeader);
        uid = authUser.uid;
      } catch {
        // Unauthenticated listing allowed
      }
    }

    const { challenges, progress } = await quickChallengeService.listChallenges(uid);

    return NextResponse.json({
      data: {
        challenges,
        progress,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

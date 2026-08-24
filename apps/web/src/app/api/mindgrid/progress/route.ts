import { NextResponse, type NextRequest } from "next/server";
import { mindGridService } from "@/services/MindGridService";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const progress = await mindGridService.getUserProgress(authUser.uid);

    return NextResponse.json({
      data: {
        progress,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

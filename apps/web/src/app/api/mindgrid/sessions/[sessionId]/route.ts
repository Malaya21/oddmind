import { NextResponse, type NextRequest } from "next/server";
import { mindGridService } from "@/services/MindGridService";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const authUser = await verifyIdToken(request.headers.get("authorization"));

    const { session, publicCase } = await mindGridService.getSessionState(
      authUser.uid,
      sessionId,
    );

    return NextResponse.json({
      data: {
        session,
        publicCase,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

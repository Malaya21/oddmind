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
    const { timelineOrder } = body;

    if (!Array.isArray(timelineOrder)) {
      throw new ValidationError("timelineOrder", "timelineOrder must be an array of event IDs.");
    }

    const session = await mindGridService.saveTimeline(
      authUser.uid,
      sessionId,
      timelineOrder,
    );

    return NextResponse.json({
      data: {
        session,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

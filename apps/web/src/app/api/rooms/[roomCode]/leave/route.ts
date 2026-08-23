import { NextResponse, type NextRequest } from "next/server";
import { createServices } from "@/lib/di";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomCode: string }> },
) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const { roomCode } = await context.params;
    const { roomService } = createServices();
    await roomService.leaveRoom(roomCode, authUser.uid);

    logger.info("room.left", { roomCode, uid: authUser.uid });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleApiError(error);
  }
}

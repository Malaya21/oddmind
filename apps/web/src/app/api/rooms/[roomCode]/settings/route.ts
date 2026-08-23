import { NextResponse, type NextRequest } from "next/server";
import type { RoomSettings } from "@/types";
import { createRepositories, createServices } from "@/lib/di";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { normalizeRoomCode } from "@/lib/room-code";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";

interface UpdateSettingsBody {
  settings: Partial<RoomSettings>;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ roomCode: string }> },
) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const { roomCode } = await context.params;
    const body = (await request.json()) as UpdateSettingsBody;
    const { roomRepository } = createRepositories();
    const room = await roomRepository.getRoomByCode(normalizeRoomCode(roomCode));

    if (!room) {
      throw new NotFoundError("ROOM_NOT_FOUND", "Room not found.");
    }

    const { roomService } = createServices();
    const updated = await roomService.updateSettings(
      room.id,
      authUser.uid,
      body.settings,
    );

    logger.info("room.settings.updated", {
      roomId: room.id,
      roomCode: room.roomCode,
      uid: authUser.uid,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

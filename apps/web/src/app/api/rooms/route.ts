import { NextResponse, type NextRequest } from "next/server";
import type { RoomSettings } from "@/types";
import { createRepositories, createServices } from "@/lib/di";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { logger } from "@/lib/logger";

interface CreateRoomBody {
  settings?: Partial<RoomSettings>;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const body = (await request.json().catch(() => ({}))) as CreateRoomBody;
    const { userService, roomService } = createServices();
    const user = await userService.ensureUser(authUser.uid);
    const room = await roomService.createRoom({
      hostUid: authUser.uid,
      hostDisplayName: user.displayName ?? "Player",
      settings: body.settings as RoomSettings | undefined,
    });
    const { playerRepository } = createRepositories();
    const players = await playerRepository.getPlayers(room.id);

    logger.info("room.created", {
      roomId: room.id,
      roomCode: room.roomCode,
      hostUid: authUser.uid,
    });

    return NextResponse.json({ data: { room, players } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { createRepositories, createServices } from "@/lib/di";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { logger } from "@/lib/logger";

interface JoinRoomBody {
  roomCode: string;
  displayName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const body = (await request.json()) as JoinRoomBody;
    const { userService, roomService } = createServices();
    let user = await userService.ensureUser(authUser.uid);
    if (body.displayName?.trim() && user.displayName !== body.displayName.trim()) {
      user = await userService.updateDisplayName(authUser.uid, body.displayName.trim());
    }

    const room = await roomService.joinRoom(
      body.roomCode,
      authUser.uid,
      user.displayName ?? `Player_${authUser.uid.slice(0, 4)}`,
    );
    const { playerRepository } = createRepositories();
    const players = await playerRepository.getPlayers(room.id);

    logger.info("room.joined", {
      roomId: room.id,
      roomCode: room.roomCode,
      uid: authUser.uid,
    });

    return NextResponse.json({ data: { room, players } });
  } catch (error) {
    return handleApiError(error);
  }
}

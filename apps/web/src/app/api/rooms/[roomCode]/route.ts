import { NextResponse, type NextRequest } from "next/server";
import { createRepositories } from "@/lib/di";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { normalizeRoomCode } from "@/lib/room-code";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomCode: string }> },
) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const { roomCode } = await context.params;
    const { roomRepository, playerRepository } = createRepositories();
    const room = await roomRepository.getRoomByCode(normalizeRoomCode(roomCode));

    if (!room) {
      throw new NotFoundError("ROOM_NOT_FOUND", "Room not found.");
    }

    const players = await playerRepository.getPlayers(room.id);
    if (!players.some((player) => player.uid === authUser.uid)) {
      throw new UnauthorizedError(
        "ROOM_ACCESS_DENIED",
        "Join the room before opening the lobby.",
      );
    }

    return NextResponse.json({ data: { room, players } });
  } catch (error) {
    return handleApiError(error);
  }
}

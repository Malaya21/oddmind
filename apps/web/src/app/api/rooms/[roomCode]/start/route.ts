import { NextResponse, type NextRequest } from 'next/server';
import { createRepositories, createServices } from '@/lib/di';
import { verifyIdToken } from '@/lib/auth/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import { normalizeRoomCode } from '@/lib/room-code';
import { NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomCode: string }> },
) {
  try {
    const authUser = await verifyIdToken(request.headers.get('authorization'));
    const { roomCode } = await context.params;
    const { roomRepository } = createRepositories();
    const room = await roomRepository.getRoomByCode(normalizeRoomCode(roomCode));

    if (!room) {
      throw new NotFoundError('ROOM_NOT_FOUND', 'Room not found.');
    }

    const { gameService } = createServices();
    const result = await gameService.startGame(room.id, authUser.uid);

    logger.info('game.started', {
      roomId: room.id,
      roomCode: room.roomCode,
      gameId: result.gameId,
      hostUid: authUser.uid,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}


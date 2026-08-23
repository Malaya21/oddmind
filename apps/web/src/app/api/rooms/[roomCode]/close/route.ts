import { NextResponse, type NextRequest } from 'next/server';
import { createServices } from '@/lib/di';
import { verifyIdToken } from '@/lib/auth/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomCode: string }> },
) {
  try {
    const authUser = await verifyIdToken(request.headers.get('authorization'));
    const { roomCode } = await context.params;
    const { roomService } = createServices();
    const closedRoom = await roomService.closeRoom(roomCode, authUser.uid);

    logger.info('room.closed', {
      roomId: closedRoom.id,
      roomCode: closedRoom.roomCode,
      hostUid: authUser.uid,
    });

    return NextResponse.json({ data: { ok: true, room: closedRoom } });
  } catch (error) {
    return handleApiError(error);
  }
}


import { NextResponse, type NextRequest } from 'next/server';
import { createRepositories } from '@/lib/di';
import { verifyIdToken } from '@/lib/auth/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const authUser = await verifyIdToken(request.headers.get('authorization'));
    const { gameId } = await context.params;
    const { gameRepository } = createRepositories();
    const game = await gameRepository.getGame(gameId);

    if (!game) {
      throw new NotFoundError('GAME_NOT_FOUND', 'Game not found.');
    }

    if (!game.playerIds.includes(authUser.uid)) {
      throw new UnauthorizedError('NOT_A_PLAYER', 'You are not a player in this game.');
    }

    return NextResponse.json({ data: game });
  } catch (error) {
    return handleApiError(error);
  }
}


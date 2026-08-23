import { NextResponse, type NextRequest } from 'next/server';
import { createRepositories, createServices } from '@/lib/di';
import { verifyIdToken } from '@/lib/auth/server';
import { handleApiError } from '@/lib/api/handle-api-error';

interface ChatBody {
  text: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const authUser = await verifyIdToken(request.headers.get('authorization'));
    const { gameId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as ChatBody;

    const { gameService } = createServices();
    const { playerRepository, gameRepository } = createRepositories();
    const game = await gameRepository.getGame(gameId);
    let displayName = 'Player';
    if (game) {
      const roomPlayers = await playerRepository.getPlayers(game.roomId);
      const p = roomPlayers.find((rp) => rp.uid === authUser.uid);
      if (p?.displayName) displayName = p.displayName;
    }

    const message = await gameService.sendMessage(
      gameId,
      authUser.uid,
      displayName,
      body.text,
    );

    return NextResponse.json({ data: message });
  } catch (error) {
    return handleApiError(error);
  }
}


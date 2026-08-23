import { NextResponse, type NextRequest } from 'next/server';
import { createRepositories } from '@/lib/di';
import { verifyIdToken } from '@/lib/auth/server';
import { handleApiError } from '@/lib/api/handle-api-error';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const authUser = await verifyIdToken(request.headers.get('authorization'));
    const { gameId } = await context.params;
    const { gameRepository } = createRepositories();
    const view = await gameRepository.getPlayerView(gameId, authUser.uid);
    return NextResponse.json({ data: view });
  } catch (error) {
    return handleApiError(error);
  }
}


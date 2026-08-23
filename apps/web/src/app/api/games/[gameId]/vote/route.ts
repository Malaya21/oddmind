import { NextResponse, type NextRequest } from 'next/server';
import { createServices } from '@/lib/di';
import { verifyIdToken } from '@/lib/auth/server';
import { handleApiError } from '@/lib/api/handle-api-error';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const authUser = await verifyIdToken(request.headers.get('authorization'));
    const { gameId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { targetUid?: string };
    const { gameService } = createServices();
    await gameService.submitVote(gameId, authUser.uid, body.targetUid ?? '');
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleApiError(error);
  }
}


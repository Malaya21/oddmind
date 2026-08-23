import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth } from '@/infrastructure/firebase/admin';
import { createServices } from '@/lib/di';
import { handleApiError } from '@/lib/api/handle-api-error';
import { logger } from '@/lib/logger';
import { getClientEnv } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { displayName?: string };
    const adminAuth = getAdminAuth();
    const userRecord = await adminAuth.createUser({
      displayName: body.displayName || undefined,
    });
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    // Exchange custom token for a real ID token on the server
    const apiKey = getClientEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
    const exchangeUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;
    const exchangeRes = await fetch(exchangeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    });
    const exchangeData = (await exchangeRes.json().catch(() => ({}))) as {
      idToken?: string;
    };
    const idToken = exchangeData.idToken ?? null;

    const { userService } = createServices();
    let profile = await userService.ensureUser(userRecord.uid);
    if (body.displayName?.trim()) {
      profile = await userService.updateDisplayName(userRecord.uid, body.displayName.trim());
    }

    logger.info('auth.guest_created', { uid: userRecord.uid, displayName: body.displayName });

    return NextResponse.json({
      data: {
        idToken,
        customToken,
        uid: userRecord.uid,
        profile,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}


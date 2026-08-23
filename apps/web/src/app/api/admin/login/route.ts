import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth } from "@/infrastructure/firebase/admin";
import { createServices } from "@/lib/di";
import { handleApiError } from "@/lib/api/handle-api-error";
import { logger } from "@/lib/logger";
import { getClientEnv } from "@/lib/env";
import { UnauthorizedError } from "@/lib/errors";

const ADMIN_EMAIL = "sahomalaya21@gmail.com";
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "malaya21";

interface AdminLoginBody {
  email?: string;
  passcode?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as AdminLoginBody;
    const requestedEmail = body.email?.trim().toLowerCase();

    if (requestedEmail !== ADMIN_EMAIL) {
      throw new UnauthorizedError(
        "INVALID_ADMIN_EMAIL",
        `Only ${ADMIN_EMAIL} is authorized for admin access.`,
      );
    }

    if (body.passcode !== ADMIN_PASSCODE && body.passcode !== "malaya21") {
      throw new UnauthorizedError("INVALID_PASSCODE", "Invalid admin passcode.");
    }

    const adminAuth = getAdminAuth();
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(ADMIN_EMAIL);
    } catch {
      userRecord = await adminAuth.createUser({
        email: ADMIN_EMAIL,
        displayName: "Malay Saho",
        emailVerified: true,
      });
    }

    const customToken = await adminAuth.createCustomToken(userRecord.uid, {
      admin: true,
      email: ADMIN_EMAIL,
    });

    // Exchange custom token for real ID token on server
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
    const profile = await userService.ensureUser(userRecord.uid);
    await userService.updateDisplayName(userRecord.uid, "Malay Saho");

    logger.info("admin.login_success", { uid: userRecord.uid, email: ADMIN_EMAIL });

    return NextResponse.json({
      data: {
        idToken,
        customToken,
        uid: userRecord.uid,
        email: ADMIN_EMAIL,
        profile,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

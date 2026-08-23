import { getAdminAuth } from "@/infrastructure/firebase/admin";
import type { AuthUser } from "@/types";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function verifyIdToken(
  authorizationHeader: string | null,
): Promise<AuthUser> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError(
      "MISSING_TOKEN",
      "Authorization header with Bearer token is required.",
    );
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new UnauthorizedError("MISSING_TOKEN", "Bearer token is empty.");
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      isAnonymous: decoded.firebase.sign_in_provider === "anonymous",
      email: decoded.email ?? null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid or expired token.";
    logger.error("auth.verify_id_token_failed", { message });
    throw new UnauthorizedError("INVALID_TOKEN", "Invalid or expired token.");
  }
}

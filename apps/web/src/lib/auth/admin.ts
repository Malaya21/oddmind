import type { AuthUser } from "@/types";
import { UnauthorizedError } from "@/lib/errors";

export const ADMIN_EMAILS = ["sahomalaya21@gmail.com"] as const;

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase() as typeof ADMIN_EMAILS[number]);
}

export function requireAdmin(user: AuthUser | null | undefined): void {
  if (!isAdminUser(user)) {
    throw new UnauthorizedError(
      "ADMIN_REQUIRED",
      "Access denied. Admin privileges (sahomalaya21@gmail.com) required.",
    );
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { createServices } from "@/lib/di";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const { userService } = createServices();
    const user = await userService.regenerateDisplayName(authUser.uid);

    logger.info("user.display_name.regenerated", { uid: authUser.uid });

    return NextResponse.json({ data: user });
  } catch (error) {
    return handleApiError(error);
  }
}

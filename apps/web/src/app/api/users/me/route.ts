import { NextResponse, type NextRequest } from "next/server";
import { createServices } from "@/lib/di";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const { userService } = createServices();
    const user = await userService.ensureUser(authUser.uid);

    logger.info("user.profile.loaded", { uid: authUser.uid });

    return NextResponse.json({ data: user });
  } catch (error) {
    return handleApiError(error);
  }
}

interface UpdateProfileBody {
  displayName: string;
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    const body = (await request.json()) as UpdateProfileBody;

    if (typeof body.displayName !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_BODY",
            message: "displayName is required.",
          },
        },
        { status: 422 },
      );
    }

    const { userService } = createServices();
    const user = await userService.updateDisplayName(
      authUser.uid,
      body.displayName,
    );

    logger.info("user.display_name.updated", { uid: authUser.uid });

    return NextResponse.json({ data: user });
  } catch (error) {
    return handleApiError(error);
  }
}

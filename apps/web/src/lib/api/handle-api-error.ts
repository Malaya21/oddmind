import { NextResponse } from "next/server";
import { OddMindError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof OddMindError) {
    if (error.statusCode >= 500) {
      logger.error("api.error", { code: error.code, message: error.message });
    }
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode },
    );
  }

  logger.error("api.unexpected_error", {
    message: error instanceof Error ? error.message : "Unknown error",
  });

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    },
    { status: 500 },
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { serverCaseRepository } from "@/server/mindgrid/ServerCaseRepository";
import { mindGridService } from "@/services/MindGridService";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";

export async function GET(request: NextRequest) {
  try {
    const cases = await serverCaseRepository.getAllPublicCases();
    let progress = null;

    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      try {
        const authUser = await verifyIdToken(authHeader);
        progress = await mindGridService.getUserProgress(authUser.uid);
      } catch {
        // Optional auth on case listing
      }
    }

    return NextResponse.json({
      data: {
        cases,
        progress,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { verifyIdToken } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/admin";
import { handleApiError } from "@/lib/api/handle-api-error";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    requireAdmin(authUser);

    const db = getAdminFirestore();

    const collectionsToWipe = [
      "rooms",
      "games",
      "roomCodes",
      "activeRoomMemberships",
      "signals",
      "users",
    ];

    let totalDeletedDocs = 0;

    for (const colName of collectionsToWipe) {
      const colRef = db.collection(colName);
      const snap = await colRef.get();
      totalDeletedDocs += snap.size;

      // Use recursiveDelete on each document to wipe all subcollections (rounds, votes, players, secrets, messages, etc.)
      for (const doc of snap.docs) {
        // Keep admin user record if in users collection
        if (colName === "users" && doc.id === authUser.uid) {
          continue;
        }
        await db.recursiveDelete(doc.ref);
      }
    }

    logger.info("admin.db_wipe_completed", {
      adminEmail: authUser.email ?? undefined,
      totalDeletedDocs,
      collectionsWiped: collectionsToWipe.join(", "),
    });

    return NextResponse.json({
      data: {
        success: true,
        message: `Successfully wiped all test data across ${collectionsToWipe.join(", ")}.`,
        totalDeletedDocs,
        collectionsWiped: collectionsToWipe,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

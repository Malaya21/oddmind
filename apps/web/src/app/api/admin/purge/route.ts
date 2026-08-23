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

    // 1. Delete all activeRoomMemberships
    const membershipsSnap = await db.collection("activeRoomMemberships").get();
    const membershipBatch = db.batch();
    membershipsSnap.docs.forEach((doc) => {
      membershipBatch.delete(doc.ref);
    });
    await membershipBatch.commit();

    // 2. Delete all roomCodes locks
    const roomCodesSnap = await db.collection("roomCodes").get();
    const codesBatch = db.batch();
    roomCodesSnap.docs.forEach((doc) => {
      codesBatch.delete(doc.ref);
    });
    await codesBatch.commit();

    // 3. Mark all active rooms as CANCELLED
    const roomsSnap = await db.collection("rooms").get();
    let cancelledRoomsCount = 0;
    const roomsBatch = db.batch();
    roomsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === "LOBBY" || data.status === "IN_PROGRESS") {
        roomsBatch.update(doc.ref, {
          status: "CANCELLED",
          updatedAt: new Date().toISOString(),
        });
        cancelledRoomsCount += 1;
      }
    });
    await roomsBatch.commit();

    // 4. Mark all active games as ABANDONED
    const gamesSnap = await db.collection("games").get();
    let abandonedGamesCount = 0;
    const gamesBatch = db.batch();
    gamesSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === "ACTIVE") {
        gamesBatch.update(doc.ref, {
          status: "ABANDONED",
          updatedAt: new Date().toISOString(),
        });
        abandonedGamesCount += 1;
      }
    });
    await gamesBatch.commit();

    logger.info("admin.purge_completed", {
      adminEmail: authUser.email ?? undefined,
      membershipsPurged: membershipsSnap.size,
      roomCodesPurged: roomCodesSnap.size,
      roomsCancelled: cancelledRoomsCount,
      gamesAbandoned: abandonedGamesCount,
    });

    return NextResponse.json({
      data: {
        success: true,
        message: "All active rooms, games, and player sessions have been revoked.",
        membershipsPurged: membershipsSnap.size,
        roomCodesPurged: roomCodesSnap.size,
        roomsCancelled: cancelledRoomsCount,
        gamesAbandoned: abandonedGamesCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

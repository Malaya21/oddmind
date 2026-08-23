import { NextResponse, type NextRequest } from "next/server";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { verifyIdToken } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/admin";
import { handleApiError } from "@/lib/api/handle-api-error";
import type { Room } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyIdToken(request.headers.get("authorization"));
    requireAdmin(authUser);

    const db = getAdminFirestore();

    const [roomsSnap, gamesSnap, membershipsSnap] = await Promise.all([
      db.collection("rooms").get(),
      db.collection("games").get(),
      db.collection("activeRoomMemberships").get(),
    ]);

    const allRooms = roomsSnap.docs.map((doc) => doc.data() as Room);
    const activeRooms = allRooms.filter(
      (r) => r.status === "LOBBY" || r.status === "IN_PROGRESS",
    );
    const activeGames = gamesSnap.docs
      .map((doc) => doc.data())
      .filter((g) => g.status === "ACTIVE");

    return NextResponse.json({
      data: {
        adminEmail: authUser.email,
        activeRoomsCount: activeRooms.length,
        activeGamesCount: activeGames.length,
        activeMembershipsCount: membershipsSnap.size,
        totalRoomsCount: allRooms.length,
        activeRooms,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

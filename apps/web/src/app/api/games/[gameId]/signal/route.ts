import { NextResponse, type NextRequest } from "next/server";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { verifyIdToken } from "@/lib/auth/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

// POST /api/games/[gameId]/signal
// Send WebRTC signaling message (offer, answer, candidate)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { gameId } = await params;
    const authUser = await verifyIdToken(request.headers.get("authorization"));

    const body = await request.json();
    const { to, data } = body;

    if (!to || typeof to !== "string") {
      throw new ValidationError("to", "Recipient UID is required.");
    }
    if (!data || typeof data !== "object") {
      throw new ValidationError("data", "Signal payload is required.");
    }

    const db = getAdminFirestore();
    const signalId = `${authUser.uid}_${to}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const signalRef = db
      .collection("games")
      .doc(gameId)
      .collection("signals")
      .doc(signalId);

    await signalRef.set({
      from: authUser.uid,
      to,
      data,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      data: { success: true, signalId },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/games/[gameId]/signal
// Server-Sent Events (SSE) stream for real-time WebRTC signals (bypasses Cloud Firestore rule restrictions)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { gameId } = await params;

    // Support token from Authorization header or ?token= query parameter for EventSource
    let rawToken = request.headers.get("authorization");
    if (!rawToken) {
      const url = new URL(request.url);
      const queryToken = url.searchParams.get("token");
      if (queryToken) {
        rawToken = `Bearer ${queryToken}`;
      }
    }

    const authUser = await verifyIdToken(rawToken);
    const db = getAdminFirestore();

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        // Send initial heartbeat comment
        controller.enqueue(encoder.encode(": connected\n\n"));

        const signalsQuery = db
          .collection("games")
          .doc(gameId)
          .collection("signals")
          .where("to", "==", authUser.uid);

        const unsubscribe = signalsQuery.onSnapshot(
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const docData = change.doc.data();
                const payload = {
                  id: change.doc.id,
                  from: docData.from,
                  to: docData.to,
                  data: docData.data,
                  createdAt: docData.createdAt,
                };

                try {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
                  );
                } catch {
                  // Controller may be closed
                }

                // Delete processed signal
                change.doc.ref.delete().catch(() => {});
              }
            });
          },
          (error) => {
            logger.warn("webrtc.sse_signal_listener_error", {
              gameId,
              uid: authUser.uid,
              error: error.message,
            });
          },
        );

        // Keep-alive heartbeat interval every 15s
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            clearInterval(heartbeatInterval);
          }
        }, 15000);

        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeatInterval);
          unsubscribe();
          try {
            controller.close();
          } catch {}
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

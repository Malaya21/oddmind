import type { PresenceState } from "@/types";
import type { Unsubscribe } from "@/types/auth";

export interface PresenceProvider {
  setOnline(roomId: string, uid: string): Promise<void>;
  setOffline(roomId: string, uid: string): Promise<void>;
  heartbeat(roomId: string, uid: string): Promise<void>;
  subscribePresence(
    roomId: string,
    callback: (states: Record<string, PresenceState>) => void,
  ): Unsubscribe;
}

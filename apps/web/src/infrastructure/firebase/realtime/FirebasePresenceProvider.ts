import type { PresenceProvider } from "@/services/PresenceProvider";
import type { PresenceState } from "@/types";
import type { Unsubscribe } from "@/types/auth";
import { NotImplementedError } from "@/lib/errors";

export class FirebasePresenceProvider implements PresenceProvider {
  async setOnline(_roomId: string, _uid: string): Promise<void> {
    throw new NotImplementedError(
      "FirebasePresenceProvider.setOnline will be implemented in Phase 8.",
    );
  }

  async setOffline(_roomId: string, _uid: string): Promise<void> {
    throw new NotImplementedError(
      "FirebasePresenceProvider.setOffline will be implemented in Phase 8.",
    );
  }

  async heartbeat(_roomId: string, _uid: string): Promise<void> {
    throw new NotImplementedError(
      "FirebasePresenceProvider.heartbeat will be implemented in Phase 8.",
    );
  }

  subscribePresence(
    _roomId: string,
    _callback: (states: Record<string, PresenceState>) => void,
  ): Unsubscribe {
    throw new NotImplementedError(
      "FirebasePresenceProvider.subscribePresence will be implemented in Phase 8.",
    );
  }
}

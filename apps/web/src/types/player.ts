export type ConnectionStatus = "connected" | "disconnected" | "inactive";

export interface RoomPlayer {
  uid: string;
  displayName: string;
  isHost: boolean;
  joinedAt: string;
  connectionStatus: ConnectionStatus;
  lastSeenAt: string;
  active?: boolean;
}

export interface PresenceState {
  online: boolean;
  lastHeartbeat: string;
  disconnectedAt: string | null;
}

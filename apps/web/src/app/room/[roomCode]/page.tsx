import { LobbyClient } from "@/features/lobby/LobbyClient";

interface RoomPageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomCode } = await params;
  return <LobbyClient roomCode={roomCode} />;
}


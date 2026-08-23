"use client";

import { useEffect, useRef, useState } from "react";
import { Send, MessageSquare, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChatMessage } from "@/types";
import { FirebaseGameRealtimeService } from "@/infrastructure/firebase/realtime/FirebaseGameRealtimeService";
import { sendChatMessage } from "@/lib/api/client";
import { OddMindError } from "@/lib/errors";

interface GameChatProps {
  gameId: string;
  roundNumber: number;
  isEliminated: boolean;
  getIdToken: () => Promise<string | null>;
}

export function GameChat({
  gameId,
  roundNumber,
  isEliminated,
  getIdToken,
}: GameChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeService = useRef(new FirebaseGameRealtimeService());

  useEffect(() => {
    const roundId = `round_${roundNumber}`;
    const unsubscribe = realtimeService.current.subscribeToMessages(
      gameId,
      roundId,
      (newMessages) => {
        setMessages(newMessages);
      },
    );

    return () => unsubscribe();
  }, [gameId, roundNumber]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending || isEliminated) return;

    setSending(true);
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
      await sendChatMessage(token, gameId, text.trim());
      setText("");
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur flex flex-col h-[320px]">
      <CardHeader className="py-2.5 px-4 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
          <MessageSquare className="size-3.5" />
          Text Chat {isEliminated && <span className="text-destructive font-normal">(Spectator - Read Only)</span>}
        </CardTitle>
        <span className="text-[10px] text-muted-foreground">{messages.length} msgs</span>
      </CardHeader>

      <CardContent className="p-3 flex-1 flex flex-col justify-between overflow-hidden">
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground/60 italic text-center text-xs">
              No chat messages yet in this round.
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="flex flex-col bg-muted/40 rounded p-1.5 border border-border/30">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{m.displayName}</span>
                  <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-foreground/90 mt-0.5 break-words">{m.text}</p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        {isEliminated ? (
          <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-1.5">
            <ShieldAlert className="size-3.5 shrink-0" />
            <span>You have been eliminated. Chat sending is disabled for spectators.</span>
          </div>
        ) : (
          <form onSubmit={handleSend} className="mt-2 flex gap-1.5">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              maxLength={200}
              disabled={sending}
              className="h-8 text-xs bg-background/80"
            />
            <Button type="submit" size="sm" disabled={sending || !text.trim()} className="h-8 px-2.5">
              <Send className="size-3.5" />
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

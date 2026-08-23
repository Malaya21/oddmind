"use client";

import { cn } from "@/lib/utils";

type ConnectionStatusVariant = "connected" | "reconnecting" | "lost";

const STATUS_CONFIG: Record<
  ConnectionStatusVariant,
  { label: string; dotClass: string }
> = {
  connected: {
    label: "Connected",
    dotClass: "bg-emerald-500",
  },
  reconnecting: {
    label: "Reconnecting...",
    dotClass: "bg-amber-400 animate-pulse",
  },
  lost: {
    label: "Connection lost",
    dotClass: "bg-red-500",
  },
};

interface ConnectionStatusProps {
  status?: ConnectionStatusVariant;
  className?: string;
}

export function ConnectionStatus({
  status = "connected",
  className,
}: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn("size-2 rounded-full", config.dotClass)}
        aria-hidden
      />
      <span>{config.label}</span>
    </div>
  );
}

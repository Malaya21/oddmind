import React from "react";
import { cn } from "@/lib/utils";

interface OddMindLogoProps {
  className?: string;
  size?: number | string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function OddMindLogoIcon({
  className = "",
  size = 32,
}: {
  className?: string;
  size?: number | string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-300 hover:scale-105", className)}
      aria-label="OddMind Logo"
    >
      <defs>
        {/* Glow Filter */}
        <filter id="oddmind-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Primary Radiant Gradients */}
        <linearGradient id="odd-gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>

        <linearGradient id="odd-gradient-node" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>

        <linearGradient id="odd-gradient-anomaly" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>

        <linearGradient id="odd-border-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#818cf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Hexagonal Shield Container */}
      <path
        d="M60 6 L106 32 V88 L60 114 L14 88 V32 Z"
        fill="#090d16"
        stroke="url(#odd-border-gradient)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Inner Neural Deduction Grid Lines */}
      <path
        d="M60 22 L90 40 V80 L60 98 L30 80 V40 Z"
        stroke="url(#odd-gradient-primary)"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        strokeOpacity="0.5"
      />

      {/* Cross Connectors */}
      <line x1="60" y1="22" x2="60" y2="60" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.6" />
      <line x1="90" y1="40" x2="60" y2="60" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.6" />
      <line x1="90" y1="80" x2="60" y2="60" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.6" />
      <line x1="60" y1="98" x2="60" y2="60" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.6" />
      <line x1="30" y1="80" x2="60" y2="60" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.6" />
      <line x1="30" y1="40" x2="60" y2="60" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.6" />

      {/* Outer Constellation Nodes */}
      <circle cx="60" cy="22" r="3.5" fill="url(#odd-gradient-node)" filter="url(#oddmind-glow)" />
      <circle cx="90" cy="40" r="3.5" fill="url(#odd-gradient-node)" />
      <circle cx="90" cy="80" r="3.5" fill="url(#odd-gradient-node)" />
      <circle cx="60" cy="98" r="3.5" fill="url(#odd-gradient-node)" filter="url(#oddmind-glow)" />
      <circle cx="30" cy="80" r="3.5" fill="url(#odd-gradient-node)" />
      <circle cx="30" cy="40" r="3.5" fill="url(#odd-gradient-node)" />

      {/* The "Odd" Deduction Outlier (Distinct Anomaly Node) */}
      <circle
        cx="72"
        cy="48"
        r="7.5"
        fill="url(#odd-gradient-anomaly)"
        filter="url(#oddmind-glow)"
      />
      <circle
        cx="72"
        cy="48"
        r="11"
        stroke="#f43f5e"
        strokeWidth="1.2"
        strokeOpacity="0.8"
        strokeDasharray="2 2"
      />

      {/* Central Deductive Core Pulse */}
      <circle cx="60" cy="60" r="5" fill="#ffffff" filter="url(#oddmind-glow)" />
      <circle cx="60" cy="60" r="2.5" fill="#6366f1" />
    </svg>
  );
}

export function OddMindLogo({
  className = "",
  size = 36,
  showWordmark = true,
  wordmarkClassName = "",
}: OddMindLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <OddMindLogoIcon size={size} />
      {showWordmark && (
        <div className={cn("flex flex-col leading-none", wordmarkClassName)}>
          <div className="flex items-center gap-1">
            <span className="font-black tracking-[0.2em] text-foreground text-base sm:text-lg">
              ODD<span className="text-primary font-black">MIND</span>
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-[0.25em] font-semibold text-muted-foreground">
            Deduction Hub
          </span>
        </div>
      )}
    </div>
  );
}

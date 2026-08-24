"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface MicControllerProps {
  isEliminated?: boolean;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onStreamChange?: (stream: MediaStream | null) => void;
}

export function MicController({
  isEliminated = false,
  onSpeakingChange,
  onStreamChange,
}: MicControllerProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    onSpeakingChange?.(isSpeaking);
  }, [isSpeaking, onSpeakingChange]);

  const cleanupAudio = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsEnabled(false);
    setIsSpeaking(false);
    setAudioLevel(0);
    onStreamChange?.(null);
  };

  // Auto cut-off mic immediately when player is eliminated
  useEffect(() => {
    if (isEliminated && isEnabled) {
      cleanupAudio();
      toast.info("Microphone stopped as you are now spectating.");
    }
  }, [isEliminated, isEnabled]);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const enableMic = async () => {
    if (isEliminated) {
      toast.error("Eliminated spectators cannot use the microphone.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone access is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
        },
      });

      streamRef.current = stream;
      setPermissionDenied(false);

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current || isMuted) {
          setAudioLevel(0);
          setIsSpeaking(false);
          animFrameRef.current = requestAnimationFrame(checkVolume);
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] ?? 0;
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));

        setAudioLevel(normalized);
        setIsSpeaking(normalized > 18);

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      animFrameRef.current = requestAnimationFrame(checkVolume);
      setIsEnabled(true);
      setIsMuted(false);
      onStreamChange?.(stream);
      toast.success("Microphone connected!");
    } catch (err: any) {
      console.error("[Microphone error]:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionDenied(true);
        toast.error("Microphone access was denied. You can continue using text chat.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        toast.error("No microphone device found on this computer.");
      } else {
        toast.error("Could not access microphone: " + (err.message || "Unknown error"));
      }
    }
  };

  const toggleMute = () => {
    if (!streamRef.current || isEliminated) return;

    const newMuted = !isMuted;
    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !newMuted;
    });

    setIsMuted(newMuted);
    if (newMuted) {
      setAudioLevel(0);
      setIsSpeaking(false);
      toast.info("Microphone muted.");
    } else {
      toast.info("Microphone unmuted.");
    }
  };

  if (isEliminated) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-destructive/10 px-2.5 py-1 rounded border border-destructive/20">
        <MicOff className="size-3.5 text-destructive" />
        <span>Voice Muted (Spectator)</span>
      </div>
    );
  }

  if (permissionDenied && !isEnabled) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={enableMic}
        className="gap-1.5 border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40 text-xs font-medium"
      >
        <Mic className="size-3.5" />
        <span>Retry Mic Permission</span>
      </Button>
    );
  }

  if (!isEnabled) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={enableMic}
        className="gap-1.5 border-border/80 bg-card/60 hover:bg-card text-xs font-medium"
      >
        <Mic className="size-3.5 text-primary" />
        <span>Enable Mic</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isMuted ? "outline" : "secondary"}
        size="sm"
        onClick={toggleMute}
        className={`gap-2 text-xs font-medium transition-all ${
          isMuted
            ? "border-destructive/40 text-muted-foreground hover:text-foreground"
            : isSpeaking
              ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : "border-primary/40 bg-card text-foreground"
        }`}
      >
        {isMuted ? (
          <>
            <MicOff className="size-3.5 text-destructive" />
            <span>Muted</span>
          </>
        ) : (
          <>
            <Mic className={`size-3.5 ${isSpeaking ? "text-emerald-400 animate-pulse" : "text-primary"}`} />
            <span>{isSpeaking ? "Speaking" : "Mic On"}</span>
            {/* Live Audio Visualizer Bars */}
            <div className="flex items-end gap-0.5 h-3.5 w-4 ml-0.5">
              <span
                className="w-1 rounded-full bg-emerald-400 transition-all duration-75"
                style={{
                  height: `${Math.max(20, Math.min(100, audioLevel * 1.2))}%`,
                  opacity: isSpeaking ? 1 : 0.4,
                }}
              />
              <span
                className="w-1 rounded-full bg-emerald-400 transition-all duration-75"
                style={{
                  height: `${Math.max(30, Math.min(100, audioLevel * 1.6))}%`,
                  opacity: isSpeaking ? 1 : 0.4,
                }}
              />
              <span
                className="w-1 rounded-full bg-emerald-400 transition-all duration-75"
                style={{
                  height: `${Math.max(20, Math.min(100, audioLevel * 0.9))}%`,
                  opacity: isSpeaking ? 1 : 0.4,
                }}
              />
            </div>
          </>
        )}
      </Button>
    </div>
  );
}

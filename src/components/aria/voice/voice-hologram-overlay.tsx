"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PhoneOff } from "lucide-react";

import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { agentGradient } from "@/lib/aria/mock-data";
import { cn } from "@/lib/utils";

export type VoiceOverlayPhase =
  | "greeting"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking";

interface VoiceHologramOverlayProps {
  open: boolean;
  phase: VoiceOverlayPhase;
  agentName: string;
  agentColor: string;
  micStream?: MediaStream | null;
  playbackStream?: MediaStream | null;
  continuousSession?: boolean;
  onEndCall?: () => void;
}

const PHASE_LABEL: Record<VoiceOverlayPhase, string> = {
  greeting: "Ready to listen…",
  listening: "Listening…",
  transcribing: "Processing…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const num = Number.parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function VoiceCanvas({
  levels,
  averageLevel,
  color,
  phase,
}: {
  levels: number[];
  averageLevel: number;
  color: string;
  phase: VoiceOverlayPhase;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rgb = hexToRgb(color);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();

    const draw = (time: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h) * 0.11;
      const t = time - start;
      const idlePulse =
        phase === "thinking" ||
        phase === "transcribing" ||
        phase === "greeting"
          ? 0.22 + Math.sin(t * 0.004) * 0.12
          : 0;
      const energy = Math.max(averageLevel, idlePulse, 0.06);

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 5.5);
      bg.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`);
      bg.addColorStop(0.45, `rgba(${rgb.r},${rgb.g},${rgb.b},0.06)`);
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      for (let ring = 1; ring <= 5; ring++) {
        const radius = base * (1.1 + ring * 0.42) + energy * base * 0.55;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.08 + energy * 0.22})`;
        ctx.lineWidth = 1 + ring * 0.15;
        ctx.stroke();
      }

      const barCount = levels.length || 64;
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const level = levels[i] ?? 0;
        const barLen = base * (0.35 + level * 2.1 + energy * 0.45);
        const inner = base * 1.05;
        const x1 = cx + Math.cos(angle) * inner;
        const y1 = cy + Math.sin(angle) * inner;
        const x2 = cx + Math.cos(angle) * (inner + barLen);
        const y2 = cy + Math.sin(angle) * (inner + barLen);

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`);
        grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.85 + level * 0.15})`);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      const orb = ctx.createRadialGradient(
        cx - base * 0.2,
        cy - base * 0.2,
        base * 0.05,
        cx,
        cy,
        base
      );
      orb.addColorStop(0, `rgba(255,255,255,${0.85 + energy * 0.15})`);
      orb.addColorStop(0.35, `rgba(${rgb.r},${rgb.g},${rgb.b},0.95)`);
      orb.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.05)`);

      ctx.beginPath();
      ctx.arc(cx, cy, base * (0.92 + energy * 0.08), 0, Math.PI * 2);
      ctx.fillStyle = orb;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, base * (0.92 + energy * 0.08), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + energy * 0.35})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [levels, averageLevel, color, phase, rgb.b, rgb.g, rgb.r]);

  return (
    <canvas
      ref={canvasRef}
      className="h-[min(72vw,420px)] w-[min(72vw,420px)] max-w-full"
      aria-hidden
    />
  );
}

export function VoiceHologramOverlay({
  open,
  phase,
  agentName,
  agentColor,
  micStream = null,
  playbackStream = null,
  continuousSession = false,
  onEndCall,
}: VoiceHologramOverlayProps) {
  const audioSource =
    phase === "listening"
      ? micStream
      : phase === "speaking" || phase === "greeting"
        ? playbackStream
        : null;
  const analyserActive =
    open &&
    (phase === "listening" ||
      phase === "speaking" ||
      phase === "greeting") &&
    Boolean(audioSource);
  const { levels, averageLevel } = useAudioAnalyser(audioSource, analyserActive);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[120] flex flex-col items-center justify-center",
        "bg-[#030308]/88 backdrop-blur-xl",
        "animate-in fade-in duration-300"
      )}
      aria-live="polite"
      aria-label={`${agentName} voice mode`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at center, black 20%, transparent 75%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-8 px-6">
        <div className="text-center">
          <p className="font-heading text-lg font-semibold text-white">{agentName}</p>
          <p className="mt-1 text-sm tracking-[0.2em] text-white/50 uppercase">
            {PHASE_LABEL[phase]}
          </p>
        </div>

        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{
              background: agentGradient(agentColor),
              opacity: 0.35 + averageLevel * 0.4,
            }}
          />
          <VoiceCanvas
            levels={levels}
            averageLevel={averageLevel}
            color={agentColor}
            phase={phase}
          />
        </div>

        <p className="max-w-xs text-center text-xs text-white/40">
          {phase === "greeting"
            ? `${agentName} is getting ready to hear you`
            : phase === "listening"
              ? continuousSession
                ? "Speak naturally — the conversation continues when you pause"
                : "Speak naturally — Monzi responds when you pause"
              : phase === "speaking"
                ? "Voice response in progress"
                : phase === "thinking" && continuousSession
                  ? "Monzi is working on your reply — you'll hear back soon"
                  : "Hold tight while Monzi processes your request"}
        </p>

        {onEndCall && (
          <button
            type="button"
            onClick={onEndCall}
            className={cn(
              "mt-2 flex size-14 items-center justify-center rounded-full",
              "bg-red-500/90 text-white shadow-lg shadow-red-500/30",
              "transition-transform hover:scale-105 hover:bg-red-500 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030308]"
            )}
            aria-label="End call"
          >
            <PhoneOff className="size-6" strokeWidth={2.25} />
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

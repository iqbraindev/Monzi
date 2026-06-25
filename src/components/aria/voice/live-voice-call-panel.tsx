"use client";

import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export type LiveVoiceCallPhase =
  | "preview"
  | "connecting"
  | "greeting"
  | "listening"
  | "user-speaking"
  | "thinking"
  | "speaking";

interface LiveVoiceCallOverlayProps {
  open: boolean;
  agentName: string;
  agentColor: string;
  phase: LiveVoiceCallPhase;
  error?: string | null;
  needsAudioUnlock?: boolean;
  onStartCall: () => void;
  onEndCall: () => void;
  onDismiss: () => void;
  onUnlockAudio?: () => void;
}

const PHASE_STATUS: Record<LiveVoiceCallPhase, string | null> = {
  preview: null,
  connecting: "CONNECTING…",
  greeting: "SPEAKING…",
  listening: "LISTENING…",
  "user-speaking": "HEARING YOU…",
  thinking: "THINKING…",
  speaking: "SPEAKING…",
};

const PHASE_HINT: Record<LiveVoiceCallPhase, string> = {
  preview:
    "Start a live test call to speak to your agent as you configure and iterate.",
  connecting: "Joining the voice room…",
  greeting: "Your agent is introducing itself.",
  listening: "Speak naturally — your agent responds when you pause.",
  "user-speaking": "Keep talking — I'll respond when you pause.",
  thinking: "Processing what you said…",
  speaking: "Your agent is responding.",
};

const BAR_DELAYS = ["0ms", "120ms", "240ms", "120ms", "0ms"];
const BAR_HEIGHTS = ["40%", "70%", "100%", "70%", "40%"];

function AnimatedWaveform({
  active,
  speed = "normal",
}: {
  active: boolean;
  speed?: "slow" | "normal" | "fast";
}) {
  return (
    <div
      className={cn(
        "flex h-12 items-end justify-center gap-1.5",
        active && speed === "slow" && "live-voice-wave--slow",
        active && speed === "normal" && "live-voice-wave--normal",
        active && speed === "fast" && "live-voice-wave--fast"
      )}
      aria-hidden
    >
      {BAR_HEIGHTS.map((height, i) => (
        <span
          key={i}
          className={cn(
            "live-voice-bar w-1.5 origin-bottom rounded-full bg-white/90",
            active && "live-voice-bar--active"
          )}
          style={{
            height,
            animationDelay: BAR_DELAYS[i],
          }}
        />
      ))}
    </div>
  );
}

export function LiveVoiceCallOverlay({
  open,
  agentName,
  agentColor,
  phase,
  error,
  needsAudioUnlock = false,
  onStartCall,
  onEndCall,
  onDismiss,
  onUnlockAudio,
}: LiveVoiceCallOverlayProps) {
  const inCall = phase !== "preview";
  const waveSpeed =
    phase === "listening" ||
    phase === "user-speaking" ||
    phase === "speaking" ||
    phase === "greeting"
      ? "fast"
      : phase === "connecting" || phase === "thinking"
        ? "slow"
        : "normal";

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[120] flex items-center justify-center p-4",
        "bg-[#030308]/94 backdrop-blur-xl",
        "animate-in fade-in duration-300"
      )}
      role="dialog"
      aria-modal="true"
      aria-label={`Live voice with ${agentName}`}
    >
      <div
        className={cn(
          "w-full max-w-[520px] overflow-hidden rounded-2xl border border-aria-border-subtle",
          "bg-[#08080c] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_80px_rgba(0,0,0,0.55)]",
          "animate-in zoom-in-95 duration-300"
        )}
      >
        <div className="flex flex-col items-center px-8 py-12 text-center">
          <AnimatedWaveform active speed={waveSpeed} />

          <div
            className="mt-8 size-3 rounded-full"
            style={{
              background: agentColor,
              boxShadow: `0 0 20px ${agentColor}88`,
            }}
            aria-hidden
          />

          <h3 className="mt-4 font-heading text-xl font-semibold tracking-tight text-white">
            {phase === "preview" ? "Preview your agent" : agentName}
          </h3>

          <p className="mt-3 max-w-md text-sm leading-relaxed text-aria-text-secondary">
            {PHASE_HINT[phase]}
          </p>

          {PHASE_STATUS[phase] && !error && (
            <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-aria-accent uppercase">
              {PHASE_STATUS[phase]}
            </p>
          )}

          {error && (
            <p className="mt-4 max-w-sm text-xs text-aria-danger">{error}</p>
          )}

          {needsAudioUnlock && inCall && (
            <button
              type="button"
              onClick={onUnlockAudio}
              className={cn(
                "mt-4 min-w-[160px] rounded-md border px-6 py-2.5",
                "text-xs font-semibold tracking-[0.14em] uppercase transition-all",
                "border-aria-accent text-aria-accent hover:bg-aria-accent/10"
              )}
            >
              Tap to enable audio
            </button>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {phase === "preview" ? (
              <>
                <button
                  type="button"
                  onClick={onStartCall}
                  className={cn(
                    "live-voice-start-btn min-w-[160px] rounded-md border px-6 py-2.5",
                    "text-xs font-semibold tracking-[0.14em] uppercase transition-all",
                    "border-aria-accent text-aria-accent hover:bg-aria-accent/10",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aria-accent/50"
                  )}
                >
                  Start call
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-md px-4 py-2.5 text-xs font-medium text-aria-text-muted transition-colors hover:text-aria-text-secondary"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onEndCall}
                  className={cn(
                    "min-w-[160px] rounded-md border px-6 py-2.5",
                    "text-xs font-semibold tracking-[0.14em] uppercase transition-all",
                    "border-aria-danger/50 text-aria-danger hover:bg-aria-danger/10",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aria-danger/40"
                  )}
                >
                  {error ? "Close" : "End call"}
                </button>
                {error && (
                  <button
                    type="button"
                    onClick={onStartCall}
                    className={cn(
                      "live-voice-start-btn min-w-[160px] rounded-md border px-6 py-2.5",
                      "text-xs font-semibold tracking-[0.14em] uppercase transition-all",
                      "border-aria-accent text-aria-accent hover:bg-aria-accent/10"
                    )}
                  >
                    Try again
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** @deprecated Use LiveVoiceCallOverlay */
export const LiveVoiceCallPanel = LiveVoiceCallOverlay;

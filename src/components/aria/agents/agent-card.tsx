"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  MoreHorizontal,
  Phone,
  PhoneOff,
  Settings,
  Trash2,
} from "lucide-react";

import {
  deleteAgent,
  useRemoveAgentFromCache,
} from "@/hooks/use-agents";
import { useElevenLabsVoiceSession } from "@/hooks/use-elevenlabs-voice-session";
import { useCallRingtone } from "@/hooks/use-call-ringtone";
import { AppLogo } from "@/components/aria/integrations/integration-logo";
import { AgentAvatar } from "@/components/aria/agent-avatar";
import { cn } from "@/lib/utils";
import { writeVoiceModePreference } from "@/lib/voice/preferences";
import { unlockBrowserAudio } from "@/lib/voice/unlock-audio";
import type { Agent } from "@/lib/aria/types";

const CALL_GREEN = "#70D46B";
const HANGUP_RED = "#F25C54";

const MESSAGE_BTN =
  "flex size-11 items-center justify-center rounded-full bg-[#EAEAEA] text-[#333333] transition-opacity hover:opacity-90 active:opacity-80";

const CALL_BTN =
  "flex size-11 cursor-pointer items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40";

function formatCallDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function callStatusLabel(
  state: ReturnType<typeof useElevenLabsVoiceSession>["state"]
): string {
  switch (state) {
    case "connecting":
      return "Calling…";
    case "greeting":
      return "Connected";
    case "listening":
    case "user-speaking":
      return "In call";
    case "thinking":
      return "Thinking…";
    case "speaking":
      return "Speaking…";
    case "error":
      return "Call failed";
    default:
      return "In call";
  }
}

export function AgentCard({ agent }: { agent: Agent }) {
  const removeAgentFromCache = useRemoveAgentFromCache();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = agent.status === "active";
  const canUseLiveVoice = agent.voiceAllowed && agent.voice.enabled;

  const {
    beginVoiceSession,
    disconnect,
    state: voiceState,
    error: voiceError,
    isConnected: voiceConnected,
    isSpeaking,
  } = useElevenLabsVoiceSession({
    agentId: agent.id,
    conversationId: null,
    voiceAllowed: agent.voiceAllowed,
    voiceEnabledOnAgent: agent.voice.enabled,
  });

  useCallRingtone(callActive && voiceState === "connecting");

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!callActive) return;
    if (voiceConnected && callStartTime === null) {
      setCallStartTime(Date.now());
    }
  }, [callActive, voiceConnected, callStartTime]);

  useEffect(() => {
    if (!callStartTime) return;
    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - callStartTime) / 1000));
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [callStartTime]);

  const resetCallUi = useCallback(() => {
    setCallActive(false);
    setCallStartTime(null);
    setElapsedSeconds(0);
  }, []);

  const endCall = useCallback(async () => {
    resetCallUi();
    writeVoiceModePreference(false);
    await disconnect();
  }, [disconnect, resetCallUi]);

  useEffect(() => {
    return () => {
      if (callActive) {
        writeVoiceModePreference(false);
        void disconnect();
      }
    };
  }, [callActive, disconnect]);

  const startCall = () => {
    if (!canUseLiveVoice || callActive) return;
    unlockBrowserAudio();
    setCallActive(true);
    void beginVoiceSession();
  };

  const handleDelete = async () => {
    if (agent.isDefault || deleting) return;

    setMenuOpen(false);
    const confirmed = window.confirm(
      `Delete "${agent.name}"? All conversations and memories for this agent will be removed. This cannot be undone.`
    );
    if (!confirmed) return;

    if (callActive) await endCall();

    setDeleting(true);
    try {
      await deleteAgent(agent.id);
      removeAgentFromCache(agent.id);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to delete agent"
      );
    } finally {
      setDeleting(false);
    }
  };

  const avatarCallClass = cn(
    callActive && isSpeaking && "scale-[1.03]",
    callActive && voiceState === "connecting" && "opacity-80"
  );

  return (
    <div
      className="group relative flex flex-col items-center gap-1 overflow-hidden rounded-[18px] border border-aria-border bg-aria-surface/70 px-[18px] pt-[22px] pb-4 backdrop-blur-md transition-transform hover:-translate-y-1"
      style={{ borderTopColor: agent.color, borderTopWidth: 2 }}
    >
      {/* Aura */}
      <div
        className="pointer-events-none absolute -top-[30%] left-1/2 size-40 -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${agent.color}88, transparent 65%)`,
        }}
      />

      {/* Status + connected apps */}
      <div className="absolute top-3.5 right-3.5 flex flex-col items-end gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-aria-text-secondary">
          <span
            className="size-[7px] rounded-full"
            style={{
              background: callActive
                ? CALL_GREEN
                : isActive
                  ? "#10B981"
                  : "#475569",
              boxShadow: isActive && !callActive ? "0 0 8px #10B981" : undefined,
            }}
          />
          {callActive ? "On call" : isActive ? "Active" : "Inactive"}
        </span>
        {agent.apps.length > 0 && (
          <div className="flex flex-col items-end gap-1.5">
            {agent.apps.map((app) => (
              <span key={app.name} title={app.name}>
                <AppLogo app={app} size={22} radius={6} bare />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Menu */}
      <div ref={menuRef} className="absolute top-3.5 left-3.5 z-10">
        <button
          type="button"
          aria-label="More options"
          aria-expanded={menuOpen}
          disabled={deleting}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex size-8 items-center justify-center rounded-full text-aria-text-muted transition-colors hover:text-aria-text-secondary disabled:opacity-50"
        >
          <MoreHorizontal className="size-4" />
        </button>
        {menuOpen && (
          <div className="aria-pop absolute top-[calc(100%+6px)] left-0 z-50 min-w-[168px] rounded-[12px] border border-aria-border bg-aria-elevated p-1 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
            <Link
              href={`/agents/${agent.id}/settings`}
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[13px] font-medium text-aria-text-secondary transition-colors hover:bg-aria-subtle hover:text-aria-text"
            >
              <Settings className="size-3.5" />
              Settings
            </Link>
            {!agent.isDefault ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[13px] font-medium text-aria-danger transition-colors hover:bg-aria-danger/10 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                {deleting ? "Deleting…" : "Delete agent"}
              </button>
            ) : (
              <p className="px-3 py-2 text-[12px] text-aria-text-muted">
                Default agent cannot be deleted
              </p>
            )}
          </div>
        )}
      </div>

      {/* Avatar */}
      <AgentAvatar
        assetId={agent.avatarAssetId}
        color={agent.color}
        size={80}
        breathe={!callActive}
        className={cn("relative mb-1.5 transition-transform", avatarCallClass)}
        alt={agent.name}
      />

      <h3 className="mt-1 font-heading text-xl font-bold text-aria-text">
        {agent.name}
      </h3>
      <span
        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
        style={{ color: agent.color, background: `${agent.color}28` }}
      >
        {agent.role}
      </span>

      {!callActive && (
        <p className="mt-3 text-center text-xs text-aria-text-secondary">
          {agent.conversations} conversations
          <span className="mx-1.5 text-aria-text-muted">·</span>
          <span className="text-aria-text-muted">{agent.lastActive}</span>
        </p>
      )}

      {callActive ? (
        <div className="mt-5 flex w-full flex-col items-center gap-3 pb-1">
          <p
            className="font-mono text-[28px] font-light tabular-nums tracking-wide text-aria-text"
            aria-live="polite"
          >
            {voiceState === "connecting" ? "00:00" : formatCallDuration(elapsedSeconds)}
          </p>
          <p className="text-sm text-aria-text-secondary">
            {callStatusLabel(voiceState)}
          </p>
          {voiceError && (
            <p className="max-w-full px-2 text-center text-xs text-aria-danger">
              {voiceError}
            </p>
          )}
          <button
            type="button"
            onClick={() => void endCall()}
            aria-label="End call"
            className="mt-2 flex size-14 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: HANGUP_RED }}
          >
            <PhoneOff className="size-6" strokeWidth={2.25} />
          </button>
        </div>
      ) : (
        <div className="mt-4 flex w-full items-center justify-center gap-4">
          <Link
            href={`/agents/${agent.id}`}
            aria-label={`Chat with ${agent.name}`}
            className={MESSAGE_BTN}
          >
            <MessageSquare className="size-5" strokeWidth={2} />
          </Link>

          {canUseLiveVoice ? (
            <button
              type="button"
              aria-label={`Call ${agent.name}`}
              onClick={startCall}
              className={CALL_BTN}
              style={{ backgroundColor: CALL_GREEN }}
            >
              <Phone className="size-5" strokeWidth={2.25} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Live voice unavailable"
              disabled
              title={
                agent.voiceAllowed
                  ? "Enable voice on this agent to use live conversation"
                  : "Upgrade to Starter for live voice"
              }
              className={CALL_BTN}
              style={{ backgroundColor: CALL_GREEN }}
            >
              <Phone className="size-5" strokeWidth={2.25} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

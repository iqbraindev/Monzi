"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, Phone, PhoneOff } from "lucide-react";

import { AgentAvatar } from "@/components/aria/agent-avatar";
import { useAgents } from "@/hooks/use-agents";
import { useCallDuration } from "@/hooks/use-call-duration";
import { useCallRingtone } from "@/hooks/use-call-ringtone";
import { useElevenLabsVoiceSession } from "@/hooks/use-elevenlabs-voice-session";
import type { Agent } from "@/lib/aria/types";
import { formatCallDuration } from "@/lib/voice/format-call-duration";
import { writeVoiceModePreference } from "@/lib/voice/preferences";
import { unlockBrowserAudio } from "@/lib/voice/unlock-audio";

const CALL_GREEN = "#70D46B";
const HANGUP_RED = "#F25C54";

function DashboardAgentQuickCard({ agent }: { agent: Agent }) {
  const [callActive, setCallActive] = useState(false);
  const canUseLiveVoice = agent.voiceAllowed && agent.voice.enabled;

  const {
    beginVoiceSession,
    disconnect,
    state: voiceState,
    isConnected: voiceConnected,
  } = useElevenLabsVoiceSession({
    agentId: agent.id,
    conversationId: null,
    voiceAllowed: agent.voiceAllowed,
    voiceEnabledOnAgent: agent.voice.enabled,
  });

  const { elapsedSeconds, resetCallDuration } = useCallDuration(
    callActive,
    voiceConnected
  );

  useCallRingtone(callActive && voiceState === "connecting");

  const endCall = useCallback(async () => {
    setCallActive(false);
    resetCallDuration();
    writeVoiceModePreference(false);
    await disconnect();
  }, [disconnect, resetCallDuration]);

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

  return (
    <div
      className="flex min-w-[240px] shrink-0 items-center gap-3 rounded-2xl border border-aria-border bg-aria-surface/70 px-3.5 py-3 backdrop-blur-md"
      style={{ borderTopColor: agent.color, borderTopWidth: 2 }}
    >
      <AgentAvatar
        assetId={agent.avatarAssetId}
        color={agent.color}
        size={44}
        breathe={!callActive}
        alt={agent.name}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-sm font-semibold text-aria-text">
          {agent.name}
        </p>
        <p
          className="truncate text-[11px] text-aria-text-secondary"
          aria-live={callActive ? "polite" : undefined}
        >
          {callActive ? (
            voiceState === "connecting" ? (
              "Calling…"
            ) : (
              <>
                <span className="capitalize">In call</span>
                <span className="mx-1 text-aria-text-muted">·</span>
                <span className="font-mono tabular-nums">
                  {formatCallDuration(elapsedSeconds)}
                </span>
              </>
            )
          ) : (
            <span className="capitalize">{agent.role.replace(/_/g, " ")}</span>
          )}
        </p>
      </div>

      {callActive ? (
        <button
          type="button"
          onClick={() => void endCall()}
          aria-label={`End call with ${agent.name}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: HANGUP_RED }}
        >
          <PhoneOff className="size-4" strokeWidth={2.25} />
        </button>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/agents/${agent.id}`}
            aria-label={`Message ${agent.name}`}
            className="flex size-9 items-center justify-center rounded-full border border-aria-border bg-aria-elevated text-aria-text-secondary transition-colors hover:text-aria-text"
          >
            <MessageSquare className="size-4" strokeWidth={2} />
          </Link>
          <button
            type="button"
            aria-label={`Call ${agent.name}`}
            onClick={startCall}
            disabled={!canUseLiveVoice}
            title={
              canUseLiveVoice
                ? `Call ${agent.name}`
                : agent.voiceAllowed
                  ? "Enable voice on this agent"
                  : "Upgrade for live voice"
            }
            className="flex size-9 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: CALL_GREEN }}
          >
            <Phone className="size-4" strokeWidth={2.25} />
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardAgentStrip() {
  const { data: agents = [], isLoading } = useAgents();

  if (isLoading) {
    return (
      <div className="mx-6 mt-4 flex h-[72px] shrink-0 items-center justify-center rounded-2xl border border-aria-border/60 bg-aria-surface/40">
        <Loader2 className="size-5 animate-spin text-aria-text-muted" />
      </div>
    );
  }

  if (agents.length === 0) return null;

  return (
    <div className="mx-6 mt-4 shrink-0">
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {agents.map((agent) => (
          <DashboardAgentQuickCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

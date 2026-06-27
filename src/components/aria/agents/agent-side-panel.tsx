"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  MessageSquarePlus,
  Mic,
  Phone,
  Send,
  Square,
  X,
} from "lucide-react";

import { ChatErrorNotice } from "@/components/aria/agents/chat-error-notice";
import { AgentSelector } from "@/components/aria/agents/agent-selector";
import {
  AssistantMessage,
  UserMessage,
} from "@/components/aria/agents/chat-message";
import { ToolCallCard, isDashboardTool } from "@/components/aria/agents/tool-call-card";
import { AgentAvatar } from "@/components/aria/agent-avatar";
import {
  VoiceHologramOverlay,
  type VoiceOverlayPhase,
} from "@/components/aria/voice/voice-hologram-overlay";
import { useElevenLabsVoiceSession } from "@/hooks/use-elevenlabs-voice-session";
import { writeVoiceModePreference } from "@/lib/voice/preferences";
import { useChatHistory } from "@/hooks/use-chat-history";
import { useInvalidateDashboards } from "@/hooks/use-dashboards";
import { useAgents } from "@/hooks/use-agents";
import { useUIStore } from "@/lib/store/ui-store";
import { agentGradient } from "@/lib/aria/mock-data";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/aria/types";

function messageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function mapVoiceSessionPhase(
  state: ReturnType<typeof useElevenLabsVoiceSession>["state"]
): VoiceOverlayPhase {
  switch (state) {
    case "greeting":
      return "greeting";
    case "listening":
    case "user-speaking":
      return "listening";
    case "speaking":
      return "speaking";
    case "connecting":
    case "thinking":
    default:
      return "thinking";
  }
}

interface AgentSidePanelProps {
  onClose: () => void;
}

export function AgentSidePanel({ onClose }: AgentSidePanelProps) {
  const activeAgentId = useUIStore((s) => s.activeAgentId);
  const setActiveAgent = useUIStore((s) => s.setActiveAgent);
  const { data: agents = [], isLoading: agentsLoading } = useAgents();

  const agent = agents.find((a) => a.id === activeAgentId) ?? agents[0] ?? null;

  useEffect(() => {
    if (!activeAgentId && agents[0]) {
      setActiveAgent(agents[0].id);
    }
  }, [activeAgentId, agents, setActiveAgent]);

  if (agentsLoading) {
    return <PanelShell agent={null} onClose={onClose} title="Loading…" />;
  }

  if (!agent) {
    return (
      <PanelShell agent={null} onClose={onClose} title="No agents">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-aria-text-secondary">
            Create an agent to start chatting.
          </p>
        </div>
      </PanelShell>
    );
  }

  return (
    <AgentSidePanelChat
      key={agent.id}
      agent={agent}
      agents={agents}
      onClose={onClose}
      onAgentChange={setActiveAgent}
    />
  );
}

function AgentSidePanelChat({
  agent,
  agents,
  onClose,
  onAgentChange,
}: {
  agent: Agent;
  agents: Agent[];
  onClose: () => void;
  onAgentChange: (id: string) => void;
}) {
  const { data: history, isLoading: historyLoading, refetch } = useChatHistory(
    agent.id
  );
  const [conversationOverride, setConversationOverride] = useState<
    string | null | undefined
  >(undefined);
  const conversationId =
    conversationOverride !== undefined
      ? conversationOverride
      : (history?.conversationId ?? null);
  const [startingNewChat, setStartingNewChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const invalidateDashboards = useInvalidateDashboards();
  const refreshedDashboardTools = useRef(new Set<string>());
  const voiceRefreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat/${agent.id}`,
        body: { conversationId },
      }),
    [agent.id, conversationId]
  );

  const { messages, sendMessage, status, error, stop, regenerate, setMessages } =
    useChat({
      transport,
      messages: history?.messages ?? [],
    });

  const isStreaming = status === "streaming" || status === "submitted";

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      void sendMessage({ text: trimmed });
    },
    [isStreaming, sendMessage]
  );

  const refreshHistoryFromVoice = useCallback(async () => {
    const result = await refetch();
    if (result.data?.messages) {
      setMessages(result.data.messages);
    }
    if (result.data?.conversationId) {
      setConversationOverride(result.data.conversationId);
    }
  }, [refetch, setMessages]);

  const handleVoiceTranscription = useCallback(
    (text: string, isFinal: boolean, role: "user" | "assistant") => {
      if (!isFinal || !text.trim() || role !== "assistant") return;
      clearTimeout(voiceRefreshTimer.current);
      voiceRefreshTimer.current = setTimeout(() => {
        void refreshHistoryFromVoice();
      }, 500);
    },
    [refreshHistoryFromVoice]
  );

  const {
    beginVoiceSession,
    disconnect,
    canUseVoice,
    state: voiceState,
    error: voiceSessionError,
    isConnected: voiceConnected,
    micStream,
  } = useElevenLabsVoiceSession({
    agentId: agent.id,
    conversationId,
    voiceAllowed: agent.voiceAllowed,
    voiceEnabledOnAgent: agent.voice.enabled,
    onTranscription: handleVoiceTranscription,
    onConversationId: (id) => setConversationOverride(id),
  });

  const voiceSessionActive =
    voiceConnected ||
    voiceState === "connecting" ||
    voiceState === "greeting" ||
    voiceState === "listening" ||
    voiceState === "user-speaking" ||
    voiceState === "thinking" ||
    voiceState === "speaking";

  const [draft, setDraft] = useState("");
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);

  const sendDraft = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    sendText(text);
  };

  const endVoiceSession = useCallback(() => {
    setVoiceOverlayOpen(false);
    writeVoiceModePreference(false);
    void disconnect();
  }, [disconnect]);

  const handleMicPress = () => {
    if (voiceSessionActive || voiceOverlayOpen) {
      endVoiceSession();
      return;
    }
    if (!canUseVoice || isStreaming) return;
    setVoiceOverlayOpen(true);
    void beginVoiceSession();
  };

  const voicePhase = mapVoiceSessionPhase(voiceState);

  useEffect(() => {
    if (voiceState === "idle" || voiceState === "error") {
      setVoiceOverlayOpen(false);
    }
  }, [voiceState]);

  useEffect(() => {
    return () => {
      clearTimeout(voiceRefreshTimer.current);
    };
  }, []);

  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        if (!part.type.startsWith("tool-") || !isDashboardTool(part.type)) continue;
        const state = (part as { state?: string }).state;
        if (state !== "output-available") continue;
        const key = `${msg.id}:${part.type}`;
        if (refreshedDashboardTools.current.has(key)) continue;
        refreshedDashboardTools.current.add(key);
        invalidateDashboards();
      }
    }
  }, [messages, invalidateDashboards]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const startNewChat = async () => {
    if (startingNewChat || isStreaming) return;
    setStartingNewChat(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, title: "New chat" }),
      });
      if (!res.ok) throw new Error("Failed to start new chat");
      const data = (await res.json()) as { conversationId: string };
      setConversationOverride(data.conversationId);
      setMessages([]);
      await refetch();
    } catch {
      // keep current conversation on failure
    } finally {
      setStartingNewChat(false);
    }
  };

  const lastUserText = [...messages].reverse().find((m) => m.role === "user");
  const lastUserMessage = lastUserText ? messageText(lastUserText) : "";

  const grad = agentGradient(agent.color);
  const glow = `${agent.color}88`;
  const canUseLiveVoice = canUseVoice;

  return (
    <>
      <VoiceHologramOverlay
        open={voiceOverlayOpen}
        phase={voicePhase}
        agentName={agent.name}
        agentColor={agent.color}
        micStream={micStream}
        continuousSession={voiceSessionActive}
        onEndCall={endVoiceSession}
      />
      <PanelShell
      agent={agent}
      onClose={onClose}
      title={agent.name}
      headerExtra={
        <AgentSelector
          agents={agents}
          value={agent.id}
          onChange={onAgentChange}
          disabled={isStreaming}
        />
      }
      actions={
        <>
          {canUseLiveVoice && (
            <Link
              href={`/agents/${agent.id}?voice=1`}
              onClick={onClose}
              title="Open live voice — real-time conversation with your agent"
              className="flex size-8 items-center justify-center rounded-[9px] border border-aria-primary/40 bg-aria-primary/15 text-aria-primary-light transition-colors hover:bg-aria-primary/25"
            >
              <Phone className="size-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => void startNewChat()}
            disabled={startingNewChat || isStreaming}
            aria-label="New chat"
            className="flex size-8 items-center justify-center rounded-[9px] border border-aria-border bg-aria-surface text-aria-text-secondary transition-colors hover:text-aria-text disabled:opacity-50"
          >
            <MessageSquarePlus className="size-4" />
          </button>
        </>
      }
    >
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4 pb-2"
      >
        {historyLoading && (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-2xl bg-aria-subtle/50"
              />
            ))}
          </div>
        )}

        {!historyLoading && messages.length === 0 && (
          <div className="flex max-w-[90%] gap-2 self-start">
            <AgentAvatar
              assetId={agent.avatarAssetId}
              color={agent.color}
              size={28}
              breathe
              alt={agent.name}
            />
            <div className="rounded-[16px_16px_16px_4px] border border-aria-border bg-aria-elevated/85 px-3 py-2.5 text-sm leading-relaxed text-aria-text">
              Hi! I&rsquo;m {agent.name}. Ask me to update your dashboard, pull
              data from connected apps, or answer questions.
            </div>
          </div>
        )}

        {!historyLoading &&
          messages.map((msg) => {
            if (msg.role === "user") {
              return <UserMessage key={msg.id} text={messageText(msg)} />;
            }

            const toolParts = msg.parts.filter((p) => p.type.startsWith("tool-"));

            return (
              <div
                key={msg.id}
                className="flex max-w-[90%] flex-col gap-2 self-start"
              >
                {toolParts.map((part, i) => (
                  <ToolCallCard
                    key={`${msg.id}-tool-${i}`}
                    part={part as Parameters<typeof ToolCallCard>[0]["part"]}
                  />
                ))}
                <div className="flex gap-2">
                  <span
                    className="mt-0.5 size-7 shrink-0 rounded-full"
                    style={{ background: grad, boxShadow: `0 0 10px ${glow}` }}
                  />
                  <div className="rounded-[16px_16px_16px_4px] border border-aria-border bg-aria-elevated/85 px-3 py-2.5">
                    <AssistantMessage
                      text={messageText(msg)}
                      isStreamingPlaceholder={
                        isStreaming &&
                        msg.id === messages[messages.length - 1]?.id
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2 self-start">
            <AgentAvatar
              assetId={agent.avatarAssetId}
              color={agent.color}
              size={28}
              alt={agent.name}
            />
            <div className="flex gap-1.5 rounded-[16px] border border-aria-border bg-aria-elevated/85 px-3 py-2.5">
              <TypingDot delay="0s" />
              <TypingDot delay="0.2s" />
              <TypingDot delay="0.4s" />
            </div>
          </div>
        )}

        {error && (
          <ChatErrorNotice
            error={error}
            onRetry={lastUserMessage ? () => void regenerate() : undefined}
          />
        )}
      </div>

      <div className="shrink-0 border-t border-aria-border-subtle px-4 py-3">
        {voiceSessionError && (
          <p className="mb-2 text-center text-[11px] text-aria-danger">
            {voiceSessionError}
          </p>
        )}
        <div className="flex items-center gap-2 rounded-full border border-aria-border bg-[#16161f] py-1.5 pr-1.5 pl-2 transition-all focus-within:border-aria-primary focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.14)]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendDraft();
              }
            }}
            placeholder={`Message ${agent.name}...`}
            className="min-w-0 flex-1 bg-transparent text-sm text-aria-text outline-none placeholder:text-aria-text-muted"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={() => stop()}
              aria-label="Stop"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-aria-border bg-aria-elevated text-aria-text"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <>
              <button
                type="button"
                aria-label={
                  voiceSessionActive ? "Stop voice session" : "Start voice session"
                }
                disabled={!canUseLiveVoice}
                onClick={handleMicPress}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors select-none",
                  voiceSessionActive
                    ? "bg-aria-danger/20 text-aria-danger ring-2 ring-aria-danger/40"
                    : "text-aria-text-secondary hover:bg-aria-subtle hover:text-aria-primary-light",
                  !canUseLiveVoice && "cursor-not-allowed opacity-40"
                )}
                title={
                  !canUseLiveVoice
                    ? "Voice is not available for this agent"
                    : voiceSessionActive
                      ? "Tap to end voice session"
                      : "Tap to start live voice"
                }
              >
                <Mic className="size-4" />
              </button>
              <button
                type="button"
                onClick={sendDraft}
                aria-label="Send"
                disabled={!draft.trim()}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-white transition-all",
                  draft.trim()
                    ? "aria-gradient cursor-pointer"
                    : "cursor-default bg-aria-subtle opacity-50"
                )}
              >
                <Send className="size-4" />
              </button>
            </>
          )}
        </div>
        {canUseLiveVoice && (
          <p className="mt-2 text-center text-[10px] text-aria-text-muted">
            {voiceSessionActive
              ? "Tap the mic to end voice session"
              : "Tap the mic for live voice with your agent"}
          </p>
        )}
      </div>
    </PanelShell>
    </>
  );
}

function PanelShell({
  agent,
  onClose,
  title,
  headerExtra,
  actions,
  children,
}: {
  agent: Agent | null;
  onClose: () => void;
  title: string;
  headerExtra?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="aria-slide-left flex h-full w-[min(420px,100vw)] max-w-full flex-col border-l border-aria-border bg-aria-elevated/98 shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-aria-border px-4 py-3">
        {agent ? (
          <AgentAvatar
            assetId={agent.avatarAssetId}
            color={agent.color}
            size={32}
            breathe
            alt={agent.name}
          />
        ) : (
          <span className="size-8 rounded-full bg-aria-subtle" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-heading text-[15px] font-semibold text-aria-text">
            {title}
          </div>
          {agent && (
            <div className="truncate text-[11px] text-aria-text-secondary">
              {agent.role}
            </div>
          )}
        </div>
        {headerExtra}
        {actions}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close agent panel"
          className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-aria-subtle text-aria-text-secondary transition-colors hover:text-aria-text"
        >
          <X className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function TypingDot({ delay }: { delay: string }) {
  return (
    <span
      className="size-[6px] rounded-full bg-aria-text-secondary"
      style={{ animation: `aria-typing-dot 1.2s infinite ${delay}` }}
    />
  );
}

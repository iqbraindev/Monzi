"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  MessageSquarePlus,
  Mic,
  Phone,
  RotateCcw,
  Send,
  Square,
  X,
} from "lucide-react";

import { AgentSelector } from "@/components/aria/agents/agent-selector";
import {
  AssistantMessage,
  UserMessage,
} from "@/components/aria/agents/chat-message";
import { ToolCallCard, isDashboardTool } from "@/components/aria/agents/tool-call-card";
import { AgentOrb } from "@/components/aria/agent-orb";
import {
  VoiceHologramOverlay,
  type VoiceOverlayPhase,
} from "@/components/aria/voice/voice-hologram-overlay";
import { useAgentSpeech } from "@/hooks/use-agent-speech";
import { useChatHistory } from "@/hooks/use-chat-history";
import { useInvalidateDashboards } from "@/hooks/use-dashboards";
import { usePushToTalk } from "@/hooks/use-push-to-talk";
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

const VOICE_FAREWELL_PHRASES = [
  "goodbye",
  "good bye",
  "bye bye",
  "bye",
  "stop",
  "stop listening",
  "that's all",
  "thats all",
  "thanks bye",
  "thank you bye",
  "see you",
  "talk later",
  "end session",
  "cancel",
];

function isVoiceFarewell(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/[.!?,]+$/, "");
  return VOICE_FAREWELL_PHRASES.some(
    (phrase) =>
      normalized === phrase ||
      normalized.startsWith(`${phrase} `) ||
      normalized.endsWith(` ${phrase}`)
  );
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
  const lastSpokenMessageId = useRef<string | null>(null);
  const [awaitingVoiceReply, setAwaitingVoiceReply] = useState(false);
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [voiceGreeting, setVoiceGreeting] = useState(false);
  const voiceSessionRef = useRef(false);
  const hasVoiceGreetedRef = useRef(false);
  const isStreamingRef = useRef(false);

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
  isStreamingRef.current = isStreaming;

  const sendText = useCallback(
    (text: string, options?: { fromVoice?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      if (options?.fromVoice) setAwaitingVoiceReply(true);
      void sendMessage({ text: trimmed });
    },
    [isStreaming, sendMessage]
  );

  const { speak, stop: stopSpeech, speaking, playbackStream } = useAgentSpeech({
    voiceId: agent.voice.voice_id,
    speed: agent.voice.speed,
    provider: agent.voice.provider,
  });

  const [draft, setDraft] = useState("");

  const sendDraft = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    sendText(text);
  };

  const onVoiceTranscriptRef = useRef<(text: string) => void>(() => {});
  const onVoiceEmptyRef = useRef<() => void>(() => {});

  const {
    supported: voiceSupported,
    listening,
    transcribing,
    micStream,
    interimTranscript,
    error: voiceError,
    startListening,
    cancelListening,
  } = usePushToTalk({
    disabled: isStreaming,
    onFinalTranscript: (text) => onVoiceTranscriptRef.current(text),
    onEmptyTranscript: () => onVoiceEmptyRef.current(),
  });

  const resumeVoiceListening = useCallback(() => {
    if (!voiceSessionRef.current || isStreamingRef.current) return;
    void startListening();
  }, [startListening]);

  const cancelVoiceSession = useCallback(() => {
    voiceSessionRef.current = false;
    setVoiceSessionActive(false);
    setVoiceGreeting(false);
    hasVoiceGreetedRef.current = false;
    setAwaitingVoiceReply(false);
    stopSpeech();
    cancelListening();
  }, [cancelListening, stopSpeech]);

  onVoiceTranscriptRef.current = (text) => {
    if (isVoiceFarewell(text)) {
      cancelVoiceSession();
      return;
    }
    sendText(text, { fromVoice: true });
  };
  onVoiceEmptyRef.current = () => {
    if (voiceSessionRef.current) resumeVoiceListening();
  };

  const startVoiceSession = async () => {
    if (isStreaming || voiceSessionRef.current || listening || transcribing) return;

    voiceSessionRef.current = true;
    setVoiceSessionActive(true);
    stopSpeech();

    if (!hasVoiceGreetedRef.current) {
      hasVoiceGreetedRef.current = true;
      setVoiceGreeting(true);
      await speak(`I'm ${agent.name}. Go ahead, I'm listening.`);
      setVoiceGreeting(false);
    }

    if (!voiceSessionRef.current) return;
    await startListening();
  };

  const handleMicPress = () => {
    if (
      voiceSessionActive ||
      listening ||
      transcribing ||
      speaking ||
      voiceGreeting
    ) {
      cancelVoiceSession();
      return;
    }
    void startVoiceSession();
  };

  const voiceOverlayOpen =
    voiceSessionActive ||
    listening ||
    transcribing ||
    awaitingVoiceReply ||
    speaking;

  const voicePhase: VoiceOverlayPhase = voiceGreeting
    ? "greeting"
    : listening
      ? "listening"
      : transcribing
        ? "transcribing"
        : speaking
          ? "speaking"
          : "thinking";

  useEffect(() => {
    if (error && awaitingVoiceReply) {
      setAwaitingVoiceReply(false);
      resumeVoiceListening();
    }
  }, [error, awaitingVoiceReply, resumeVoiceListening]);

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
    if (!awaitingVoiceReply || isStreaming) return;

    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (lastSpokenMessageId.current === last.id) return;

    const text = messageText(last);
    if (!text.trim()) {
      setAwaitingVoiceReply(false);
      resumeVoiceListening();
      return;
    }

    lastSpokenMessageId.current = last.id;
    setAwaitingVoiceReply(false);
    void (async () => {
      await speak(text);
      resumeVoiceListening();
    })();
  }, [awaitingVoiceReply, isStreaming, messages, speak, resumeVoiceListening]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status, interimTranscript]);

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

  const errorMessage =
    error?.message?.includes("429") || error?.message?.includes("limit")
      ? "You've reached your daily message limit. Try again tomorrow."
      : error?.message;

  const grad = agentGradient(agent.color);
  const glow = `${agent.color}88`;
  const canUseLiveVoice = agent.voiceAllowed && agent.voice.enabled;

  return (
    <>
      <VoiceHologramOverlay
        open={voiceOverlayOpen}
        phase={voicePhase}
        agentName={agent.name}
        agentColor={agent.color}
        micStream={micStream}
        playbackStream={playbackStream}
        continuousSession={voiceSessionActive}
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
            <AgentOrb color={agent.color} size={28} breathe />
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

        {listening && interimTranscript && (
          <div className="aria-slide-up max-w-[85%] self-end rounded-[16px_16px_4px_16px] border border-aria-primary/30 bg-aria-primary/15 px-3 py-2 text-sm text-aria-primary-light">
            {interimTranscript}
          </div>
        )}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2 self-start">
            <AgentOrb color={agent.color} size={28} />
            <div className="flex gap-1.5 rounded-[16px] border border-aria-border bg-aria-elevated/85 px-3 py-2.5">
              <TypingDot delay="0s" />
              <TypingDot delay="0.2s" />
              <TypingDot delay="0.4s" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-center text-xs text-aria-danger">{errorMessage}</p>
            {lastUserMessage && (
              <button
                type="button"
                onClick={() => void regenerate()}
                className="inline-flex items-center gap-1.5 rounded-full border border-aria-border px-3 py-1 text-xs text-aria-text-secondary hover:text-aria-text"
              >
                <RotateCcw className="size-3" />
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-aria-border-subtle px-4 py-3">
        {voiceError && (
          <p className="mb-2 text-center text-[11px] text-aria-danger">
            {voiceError}
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
                  voiceSessionActive ||
                  listening ||
                  transcribing ||
                  speaking ||
                  voiceGreeting
                    ? "Stop voice session"
                    : "Start voice message"
                }
                disabled={!voiceSupported}
                onClick={handleMicPress}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors select-none",
                  listening ||
                    transcribing ||
                    speaking ||
                    voiceGreeting ||
                    voiceSessionActive
                    ? "bg-aria-danger/20 text-aria-danger ring-2 ring-aria-danger/40"
                    : "text-aria-text-secondary hover:bg-aria-subtle hover:text-aria-primary-light",
                  !voiceSupported && "cursor-not-allowed opacity-40"
                )}
                title={
                  !voiceSupported
                    ? "Voice not supported in this browser"
                    : voiceSessionActive ||
                        listening ||
                        transcribing ||
                        speaking ||
                        voiceGreeting
                      ? "Tap to end voice session"
                      : "Tap to speak"
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
        {voiceSupported && (
          <p className="mt-2 text-center text-[10px] text-aria-text-muted">
            {voiceSessionActive ||
            listening ||
            transcribing ||
            speaking ||
            voiceGreeting
              ? "Tap the mic to end voice session"
              : canUseLiveVoice
                ? "Mic: quick voice message · Phone icon above: live conversation"
                : "Tap the mic to speak"}
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
          <AgentOrb color={agent.color} size={32} breathe />
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

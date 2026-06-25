"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Mic,
  Paperclip,
  PanelRight,
  Check,
  Send,
  Square,
  RotateCcw,
  MessageSquarePlus,
  Phone,
  PhoneOff,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import { AssistantMessage, UserMessage } from "@/components/aria/agents/chat-message";
import {
  isComposioTool,
  isDashboardTool,
  ToolCallCard,
} from "@/components/aria/agents/tool-call-card";
import { useElevenLabsVoiceSession } from "@/hooks/use-elevenlabs-voice-session";
import {
  LiveVoiceCallOverlay,
  type LiveVoiceCallPhase,
} from "@/components/aria/voice/live-voice-call-panel";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/aria/types";
import { agentGradient } from "@/lib/aria/mock-data";

export interface ChatHistoryProps {
  agent: Agent;
  initialMessages: UIMessage[];
  initialConversationId: string | null;
  historyLoading?: boolean;
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function extractContextFromMessages(messages: UIMessage[]) {
  const dashActions: { icon: string; label: string; href?: string }[] = [];
  const toolActions: { label: string }[] = [];

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      if (!part.type.startsWith("tool-")) continue;
      const p = part as { type: string; state?: string; output?: unknown };
      if (p.state !== "output-available") continue;

      if (isDashboardTool(p.type)) {
        const out =
          typeof p.output === "string" ? p.output : messageText(msg);
        dashActions.push({
          icon: "📊",
          label: out || "Dashboard updated",
          href: "/dashboard",
        });
      } else if (isComposioTool(p.type)) {
        const name = p.type.replace(/^tool-/, "").replace(/_/g, " ");
        toolActions.push({ label: `Fetched data via ${name}` });
      }
    }
  }

  return {
    dashActions: dashActions.slice(-5).reverse(),
    toolActions: toolActions.slice(-5).reverse(),
  };
}

export function AgentChatView({
  agent,
  initialMessages,
  initialConversationId,
  historyLoading,
}: ChatHistoryProps) {
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId
  );
  const [startingNewChat, setStartingNewChat] = useState(false);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);

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
      messages: initialMessages,
    });

  const [draft, setDraft] = useState("");
  const [contextOpen, setContextOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceTranscriptIds = useRef<Set<string>>(new Set());
  const grad = agentGradient(agent.color);
  const glow = `${agent.color}88`;
  const isStreaming = status === "streaming" || status === "submitted";
  const searchParams = useSearchParams();
  const pendingSend = searchParams.get("send");
  const autoVoice = searchParams.get("voice") === "1";
  const didAutoSend = useRef(false);
  const didAutoVoice = useRef(false);

  const { dashActions, toolActions } = useMemo(
    () => extractContextFromMessages(messages),
    [messages]
  );

  const refreshHistory = useCallback(async () => {
    if (!conversationId) return;
    const res = await fetch(
      `/api/chat/${agent.id}/history?conversationId=${conversationId}`
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      messages: UIMessage[];
      conversationId: string;
    };
    setMessages(data.messages ?? []);
  }, [agent.id, conversationId, setMessages]);

  const handleVoiceTranscription = useCallback(
    (text: string, isFinal: boolean, role: "user" | "assistant") => {
      if (!isFinal || !text.trim()) return;
      const key = `${role}:${text}`;
      if (voiceTranscriptIds.current.has(key)) return;
      voiceTranscriptIds.current.add(key);

      // Custom LLM persists turns server-side; refresh chat when ElevenLabs
      // reports a spoken line so the UI stays in sync without duplicate writes.
      void refreshHistory();
    },
    [refreshHistory]
  );

  const {
    voiceEnabled,
    setVoiceEnabled,
    beginVoiceSession,
    unlockAudio,
    needsAudioUnlock,
    canUseVoice,
    state: voiceState,
    error: voiceError,
    isConnected: voiceConnected,
    isListening,
    isSpeaking,
    toggleMicrophone,
    isMicrophoneEnabled,
    disconnect,
  } = useElevenLabsVoiceSession({
    agentId: agent.id,
    conversationId,
    voiceAllowed: agent.voiceAllowed,
    voiceEnabledOnAgent: agent.voice.enabled,
    onTranscription: handleVoiceTranscription,
    onConversationId: setConversationId,
  });

  const avatarAnimClass = cn(
    "aria-breathe relative size-[84px] rounded-full",
    isSpeaking && "scale-105",
    isListening && voiceConnected && "ring-2 ring-aria-primary/50 ring-offset-2 ring-offset-aria-base",
    voiceState === "connecting" && "animate-pulse"
  );

  useEffect(() => {
    setConversationId(initialConversationId);
    setMessages(initialMessages);
  }, [initialConversationId, initialMessages, setMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  useEffect(() => {
    if (
      pendingSend &&
      !historyLoading &&
      !didAutoSend.current &&
      status === "ready"
    ) {
      didAutoSend.current = true;
      void sendMessage({ text: pendingSend });
    }
  }, [pendingSend, historyLoading, status, sendMessage]);

  useEffect(() => {
    if (voiceEnabled) setVoicePanelOpen(true);
  }, [voiceEnabled]);

  useEffect(() => {
    if (autoVoice && canUseVoice && !didAutoVoice.current) {
      didAutoVoice.current = true;
      setVoicePanelOpen(true);
    }
  }, [autoVoice, canUseVoice]);

  useEffect(() => {
    if (!voicePanelOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [voicePanelOpen]);

  const openVoicePanel = () => {
    if (!canUseVoice) return;
    setVoicePanelOpen(true);
  };

  const dismissVoicePanel = () => {
    setVoicePanelOpen(false);
    setVoiceEnabled(false);
    if (voiceState === "error") {
      void disconnect();
    }
  };

  const startVoiceCall = () => {
    if (!canUseVoice) return;
    void beginVoiceSession();
  };

  const endVoiceCall = () => {
    setVoiceEnabled(false);
    setVoicePanelOpen(false);
  };

  const toggleLiveVoice = () => {
    if (!canUseVoice) return;
    if (voicePanelOpen || voiceEnabled) {
      endVoiceCall();
    } else {
      openVoicePanel();
    }
  };

  const liveVoicePhase: LiveVoiceCallPhase =
    voiceState === "error"
      ? "connecting"
      : !voiceEnabled || voiceState === "idle"
        ? "preview"
        : voiceState === "connecting"
          ? "connecting"
          : voiceState === "greeting"
            ? "greeting"
            : voiceState === "speaking"
              ? "speaking"
              : voiceState === "thinking"
                ? "thinking"
                : voiceState === "user-speaking"
                  ? "user-speaking"
                  : "listening";

  const send = () => {
    const text = draft.trim();
    if (!text || isStreaming) return;
    setDraft("");
    void sendMessage({ text });
  };

  const startNewChat = async () => {
    if (startingNewChat) return;
    setStartingNewChat(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, title: "New chat" }),
      });
      if (!res.ok) throw new Error("Failed to start new chat");
      const data = (await res.json()) as { conversationId: string };
      setConversationId(data.conversationId);
      setMessages([]);
    } catch {
      // keep current conversation on failure
    } finally {
      setStartingNewChat(false);
    }
  };

  const lastUserText = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  const lastUserMessage = lastUserText ? messageText(lastUserText) : "";

  const errorMessage =
    error?.message?.includes("429") || error?.message?.includes("limit")
      ? "You've reached your daily message limit. Try again tomorrow."
      : error?.message;

  const hasDraft = draft.trim().length > 0;

  return (
    <div className="relative z-[1] flex min-h-0 flex-1">
      <LiveVoiceCallOverlay
        open={voicePanelOpen}
        agentName={agent.name}
        agentColor={agent.color}
        phase={liveVoicePhase}
        error={voiceError}
        needsAudioUnlock={needsAudioUnlock}
        onStartCall={startVoiceCall}
        onEndCall={endVoiceCall}
        onDismiss={dismissVoicePanel}
        onUnlockAudio={() => void unlockAudio()}
      />

      <aside className="flex w-[280px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-aria-border-subtle bg-aria-surface/50 px-[18px] py-[22px] backdrop-blur-sm max-lg:hidden">
        <Link
          href="/agents"
          className="inline-flex h-[30px] items-center gap-1.5 self-start rounded-full border border-aria-border bg-aria-elevated py-0 pr-3 pl-2 text-xs font-medium text-aria-text-secondary transition-colors hover:border-aria-border hover:text-aria-text"
        >
          <ChevronLeft className="size-[15px]" />
          All agents
        </Link>

        <div className="relative flex flex-col items-center gap-2.5">
          <div
            className="pointer-events-none absolute -top-3.5 size-[150px] rounded-full blur-3xl"
            style={{
              background: `radial-gradient(circle, ${agent.color}66, transparent 65%)`,
            }}
          />
          <span
            className={avatarAnimClass}
            style={{ background: grad, boxShadow: `0 0 32px ${glow}` }}
          />
          <h2 className="mt-1.5 font-heading text-[22px] font-bold text-aria-text">
            {agent.name}
          </h2>
          <span className="text-xs text-aria-text-secondary">{agent.role}</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-aria-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-aria-success">
              <span className="size-1.5 rounded-full bg-aria-success" />
              {agent.status === "active" ? "Active · Ready" : "Inactive"}
            </span>
          </div>
        </div>

        <Section title="Connected apps">
          {agent.apps.length === 0 ? (
            <span className="text-xs text-aria-text-muted">
              No apps connected.{" "}
              <Link href="/integrations" className="text-aria-primary-light underline">
                Connect apps
              </Link>
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {agent.apps.map((app) => (
                <span
                  key={app.name}
                  className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-aria-border bg-[#16161f] py-0 pr-2.5 pl-1.5 text-xs text-aria-text"
                >
                  <span
                    className="flex size-5 items-center justify-center rounded-md font-heading text-[10px] font-bold text-white"
                    style={{ background: app.color }}
                  >
                    {app.glyph}
                  </span>
                  {app.name}
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section title="Memory">
          {agent.memories.length === 0 ? (
            <span className="text-xs text-aria-text-muted">
              No saved memories yet.
            </span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {agent.memories.map((m) => (
                <span
                  key={m}
                  className="rounded-[9px] border border-aria-border-subtle bg-[#16161f] px-2.5 py-1.5 text-xs leading-snug text-slate-300"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section title="Capabilities">
          <div className="flex flex-col gap-1.5">
            {agent.capabilities.map((c) => (
              <span
                key={c}
                className="flex items-center gap-2.5 text-[13px] text-slate-300"
              >
                <Check className="size-3.5 shrink-0 text-aria-success" />
                {c}
              </span>
            ))}
          </div>
        </Section>

        <div
          className={cn(
            "mt-auto flex flex-col gap-2 rounded-xl border border-aria-border-subtle bg-[#16161f] px-3 py-2.5",
            !canUseVoice && "opacity-60"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 text-[13px] font-medium text-aria-text">
              <Mic className="size-4 text-aria-primary-light" />
              Voice Mode
            </span>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              aria-label="Toggle voice mode"
              disabled={!canUseVoice}
              className={cn(
                "flex h-6 w-[42px] items-center rounded-full p-0.5 transition-all",
                voiceEnabled
                  ? "aria-gradient justify-end"
                  : "justify-start bg-aria-border",
                !canUseVoice && "cursor-not-allowed"
              )}
            >
              <span className="block size-5 rounded-full bg-white shadow" />
            </button>
          </div>
          {!agent.voiceAllowed && (
            <span className="text-[11px] text-aria-text-muted">
              Upgrade to Starter to enable voice.
            </span>
          )}
          {agent.voiceAllowed && !agent.voice.enabled && (
            <span className="text-[11px] text-aria-text-muted">
              Voice is turned off for this agent.
            </span>
          )}
          {voiceEnabled && voiceConnected && (
            <span className="text-[11px] text-aria-success">
              {isSpeaking
                ? "Speaking…"
                : isListening
                  ? "Listening…"
                  : "Voice connected"}
            </span>
          )}
          {voiceError && (
            <span className="text-[11px] text-aria-danger">{voiceError}</span>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-aria-border-subtle bg-aria-base/40 px-5">
          <span
            className="size-[34px] rounded-full"
            style={{ background: grad, boxShadow: `0 0 14px ${glow}` }}
          />
          <div className="flex flex-col">
            <span className="font-heading text-[15px] font-semibold text-aria-text">
              {agent.name}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-aria-success">
              <span className="size-1.5 rounded-full bg-aria-success" />
              {voiceEnabled && voiceConnected ? "Voice · Online" : "Online"}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleLiveVoice}
            disabled={!canUseVoice || voiceState === "connecting"}
            title={
              !canUseVoice
                ? agent.voiceAllowed
                  ? "Voice is disabled for this agent"
                  : "Upgrade to Starter to enable live voice"
                : voiceEnabled && voiceConnected
                  ? "End live voice session"
                  : "Start live voice — talk to your agent in real time"
            }
            className={cn(
              "ml-auto flex h-[34px] items-center gap-1.5 rounded-[9px] px-3 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
              voiceEnabled && voiceConnected
                ? "border border-aria-danger/40 bg-aria-danger/10 text-aria-danger hover:bg-aria-danger/15"
                : voicePanelOpen
                  ? "border border-aria-danger/40 bg-aria-danger/10 text-aria-danger hover:bg-aria-danger/15"
                  : "aria-gradient text-white hover:brightness-110"
            )}
          >
            {voiceState === "connecting" ? (
              "Connecting…"
            ) : voicePanelOpen || voiceEnabled ? (
              <>
                <PhoneOff className="size-4" />
                End voice
              </>
            ) : (
              <>
                <Phone className="size-4" />
                Talk live
              </>
            )}
          </button>
          <button
            onClick={startNewChat}
            disabled={startingNewChat || isStreaming}
            className="flex h-[34px] items-center gap-1.5 rounded-[9px] border border-aria-border bg-aria-elevated px-3 text-xs font-medium text-aria-text-secondary transition-colors hover:text-aria-text disabled:opacity-50"
          >
            <MessageSquarePlus className="size-4" />
            New chat
          </button>
          <button
            onClick={() => setContextOpen((c) => !c)}
            aria-label="Toggle context panel"
            className="flex size-[34px] items-center justify-center rounded-[9px] border border-aria-border bg-aria-elevated text-aria-text-secondary transition-colors hover:border-aria-border hover:text-aria-text"
          >
            <PanelRight className="size-[17px]" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pt-6 pb-2"
        >
          {historyLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-2xl bg-aria-subtle/50"
                />
              ))}
            </div>
          )}

          {!historyLoading && messages.length === 0 && (
            <div className="flex flex-col items-start gap-4">
              <div className="flex max-w-[82%] gap-2.5">
                <span
                  className="mt-0.5 size-[30px] shrink-0 rounded-full"
                  style={{ background: grad, boxShadow: `0 0 12px ${glow}` }}
                />
                <div className="rounded-[18px_18px_18px_4px] border border-aria-border bg-aria-elevated/85 px-[15px] py-3 text-sm leading-relaxed text-aria-text">
                  Hi! I&rsquo;m {agent.name}. Ask me anything — I can use your
                  connected apps and update your dashboard.
                </div>
              </div>
              {canUseVoice && !voicePanelOpen && !voiceConnected && (
                <button
                  type="button"
                  onClick={openVoicePanel}
                  className="aria-gradient inline-flex h-10 items-center gap-2 self-center rounded-full px-5 text-sm font-semibold text-white transition-all hover:brightness-110"
                >
                  <Phone className="size-4" />
                  Talk live
                </button>
              )}
            </div>
          )}

          {!historyLoading &&
            messages.map((msg) => {
              if (msg.role === "user") {
                return <UserMessage key={msg.id} text={messageText(msg)} />;
              }

              const toolParts = msg.parts.filter((p) =>
                p.type.startsWith("tool-")
              );

              return (
                <div
                  key={msg.id}
                  className="flex max-w-[82%] flex-col gap-2 self-start"
                >
                  {toolParts.map((part, i) => (
                    <ToolCallCard
                      key={`${msg.id}-tool-${i}`}
                      part={part as Parameters<typeof ToolCallCard>[0]["part"]}
                    />
                  ))}
                  <div className="flex gap-2.5">
                    <span
                      className="mt-0.5 size-[30px] shrink-0 rounded-full"
                      style={{ background: grad, boxShadow: `0 0 12px ${glow}` }}
                    />
                    <div className="rounded-[18px_18px_18px_4px] border border-aria-border bg-aria-elevated/85 px-[15px] py-3">
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
            <div className="flex items-center gap-2.5 self-start">
              <span
                className="size-[30px] shrink-0 rounded-full"
                style={{ background: grad, boxShadow: `0 0 12px ${glow}` }}
              />
              <div className="flex gap-1.5 rounded-[18px_18px_18px_4px] border border-aria-border bg-aria-elevated/85 px-4 py-3.5">
                <Dot delay="0s" />
                <Dot delay="0.2s" />
                <Dot delay="0.4s" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-center text-xs text-aria-danger">
                {errorMessage}
              </p>
              {lastUserMessage && (
                <button
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

        <div className="shrink-0 px-6 pt-3 pb-4.5">
          <div className="flex items-center gap-2.5 rounded-full border border-aria-border bg-[#16161f] py-1.5 pr-1.5 pl-2 transition-all focus-within:border-aria-primary focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.14)]">
            <button
              aria-label="Attach"
              disabled
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-aria-text-secondary opacity-40"
            >
              <Paperclip className="size-[18px]" />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={`Message ${agent.name}...`}
              className="min-w-0 flex-1 bg-transparent text-sm text-aria-text outline-none placeholder:text-aria-text-muted"
            />
            {isStreaming ? (
              <button
                onClick={() => stop()}
                aria-label="Stop"
                className="flex size-[38px] shrink-0 items-center justify-center rounded-full border border-aria-border bg-aria-elevated text-aria-text"
              >
                <Square className="size-4 fill-current" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => void toggleMicrophone()}
                  aria-label={
                    isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"
                  }
                  disabled={!voiceEnabled || !voiceConnected}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                    voiceEnabled && voiceConnected && isMicrophoneEnabled
                      ? "bg-aria-primary/20 text-aria-primary-light"
                      : "text-aria-text-secondary",
                    (!voiceEnabled || !voiceConnected) && "opacity-40"
                  )}
                >
                  <Mic className="size-[17px]" />
                </button>
                <button
                  onClick={send}
                  aria-label="Send"
                  className={cn(
                    "flex size-[38px] shrink-0 items-center justify-center rounded-full text-white transition-all",
                    hasDraft
                      ? "aria-gradient cursor-pointer"
                      : "cursor-default bg-aria-subtle opacity-50"
                  )}
                >
                  <Send className="size-[17px]" />
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {contextOpen && (
        <aside className="flex w-[300px] shrink-0 flex-col gap-[22px] overflow-y-auto border-l border-aria-border-subtle bg-aria-surface/50 px-[18px] py-[22px] backdrop-blur-sm max-xl:hidden">
          <Section title="Dashboard actions">
            {dashActions.length === 0 ? (
              <span className="text-xs text-aria-text-muted">
                Dashboard changes will appear here.
              </span>
            ) : (
              dashActions.map((act) => (
                <Link
                  key={act.label}
                  href={act.href ?? "/dashboard"}
                  className="flex items-center gap-2.5 rounded-xl border border-aria-primary/25 bg-aria-primary/8 px-3 py-2.5 transition-colors hover:bg-aria-primary/12"
                >
                  <span className="shrink-0 text-[15px]">{act.icon}</span>
                  <span className="flex-1 text-xs leading-snug text-aria-text">
                    {act.label}
                  </span>
                </Link>
              ))
            )}
          </Section>

          <Section title="Tool activity">
            {toolActions.length === 0 ? (
              <span className="text-xs text-aria-text-muted">
                No related data yet.
              </span>
            ) : (
              toolActions.map((act) => (
                <div
                  key={act.label}
                  className="rounded-xl border border-aria-border-subtle bg-[#16161f] px-3 py-2 text-xs text-slate-300"
                >
                  {act.label}
                </div>
              ))
            )}
          </Section>
        </aside>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[11px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
        {title}
      </span>
      {children}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-[7px] rounded-full bg-aria-text-secondary"
      style={{ animation: `aria-typing-dot 1.2s infinite ${delay}` }}
    />
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  History,
  Mic,
  Paperclip,
  Send,
  Square,
  MessageSquarePlus,
  Phone,
  PhoneOff,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import { AssistantMessage, UserMessage } from "@/components/aria/agents/chat-message";
import { ChatErrorNotice } from "@/components/aria/agents/chat-error-notice";
import { AgentActivitiesModal } from "@/components/aria/agents/agent-activities-modal";
import { AgentEnergyMeter } from "@/components/aria/agents/agent-energy-meter";
import { AgentConversationList } from "@/components/aria/agents/agent-conversation-list";
import {
  ConnectedAppIcon,
  capabilityForApp,
} from "@/components/aria/agents/connected-app-icon";
import { AgentAvatar } from "@/components/aria/agent-avatar";
import {
  isComposioTool,
  isDashboardTool,
  ToolCallCard,
} from "@/components/aria/agents/tool-call-card";
import { useElevenLabsVoiceSession } from "@/hooks/use-elevenlabs-voice-session";
import {
  useAgentConversations,
  useInvalidateAgentConversations,
} from "@/hooks/use-agent-conversations";
import { useInvalidateAgentEnergy } from "@/hooks/use-agent-energy";
import {
  VoiceHologramOverlay,
  type VoiceOverlayPhase,
} from "@/components/aria/voice/voice-hologram-overlay";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/aria/types";
import { writeVoiceModePreference } from "@/lib/voice/preferences";
import { unlockBrowserAudio } from "@/lib/voice/unlock-audio";

const CALL_GREEN = "#70D46B";
const HANGUP_RED = "#F25C54";

const CALL_BTN =
  "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40";

const NEW_CHAT_BTN =
  "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#EAEAEA] text-[#333333] transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40";

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
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [switchingConvoId, setSwitchingConvoId] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  const { data: conversations = [], isLoading: convosLoading } =
    useAgentConversations(agent.id);
  const invalidateConversations = useInvalidateAgentConversations();
  const invalidateEnergy = useInvalidateAgentEnergy();

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceRefreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
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
      if (!isFinal || !text.trim() || role !== "assistant") return;
      clearTimeout(voiceRefreshTimer.current);
      voiceRefreshTimer.current = setTimeout(() => {
        void refreshHistory();
      }, 500);
    },
    [refreshHistory]
  );

  const {
    voiceEnabled,
    beginVoiceSession,
    disconnect,
    canUseVoice,
    state: voiceState,
    error: voiceError,
    isConnected: voiceConnected,
    isListening,
    isSpeaking,
    toggleMicrophone,
    isMicrophoneEnabled,
    micStream,
  } = useElevenLabsVoiceSession({
    agentId: agent.id,
    conversationId,
    voiceAllowed: agent.voiceAllowed,
    voiceEnabledOnAgent: agent.voice.enabled,
    onTranscription: handleVoiceTranscription,
    onConversationId: setConversationId,
  });

  const avatarAnimClass = cn(
    "relative",
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
    return () => {
      clearTimeout(voiceRefreshTimer.current);
    };
  }, []);

  useEffect(() => {
    if (voiceEnabled) {
      setVoicePanelOpen(true);
      if (voiceState === "idle" || voiceState === "error") {
        void beginVoiceSession();
      }
    }
  }, [voiceEnabled, voiceState, beginVoiceSession]);

  useEffect(() => {
    if (autoVoice && canUseVoice && !didAutoVoice.current) {
      didAutoVoice.current = true;
      setVoicePanelOpen(true);
      writeVoiceModePreference(true);
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
    unlockBrowserAudio();
    setVoicePanelOpen(true);
    void beginVoiceSession();
  };

  const endVoiceCall = () => {
    setVoicePanelOpen(false);
    writeVoiceModePreference(false);
    void disconnect();
  };

  const toggleLiveVoice = () => {
    if (!canUseVoice) return;
    if (voicePanelOpen || voiceEnabled) {
      endVoiceCall();
    } else {
      openVoicePanel();
    }
  };

  const voiceSessionActive =
    voiceConnected ||
    voiceState === "connecting" ||
    voiceState === "greeting" ||
    voiceState === "listening" ||
    voiceState === "user-speaking" ||
    voiceState === "thinking" ||
    voiceState === "speaking";

  const voicePhase = mapVoiceSessionPhase(voiceState);

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
      invalidateConversations(agent.id);
    } catch {
      // keep current conversation on failure
    } finally {
      setStartingNewChat(false);
    }
  };

  const selectConversation = async (id: string) => {
    if (id === conversationId || switchingConvoId || isStreaming) return;
    setSwitchingConvoId(id);
    setLoadingThread(true);
    try {
      const res = await fetch(
        `/api/chat/${agent.id}/history?conversationId=${id}`
      );
      if (!res.ok) throw new Error("Failed to load thread");
      const data = (await res.json()) as {
        conversationId: string | null;
        messages: UIMessage[];
      };
      setConversationId(data.conversationId);
      setMessages(data.messages ?? []);
    } catch {
      window.alert("Could not load this chat thread.");
    } finally {
      setSwitchingConvoId(null);
      setLoadingThread(false);
    }
  };

  const handleThreadDeleted = (deletedId: string) => {
    invalidateConversations(agent.id);
    if (deletedId !== conversationId) return;

    const remaining = conversations.filter((c) => c.id !== deletedId);
    if (remaining[0]) {
      void selectConversation(remaining[0].id);
    } else {
      setConversationId(null);
      setMessages([]);
    }
  };

  const prevStatus = useRef(status);
  useEffect(() => {
    if (
      prevStatus.current !== "ready" &&
      status === "ready" &&
      conversationId
    ) {
      invalidateConversations(agent.id);
      invalidateEnergy(agent.id);
    }
    prevStatus.current = status;
  }, [status, conversationId, agent.id, invalidateConversations, invalidateEnergy]);

  const lastUserText = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  const lastUserMessage = lastUserText ? messageText(lastUserText) : "";
  const hasDraft = draft.trim().length > 0;

  return (
    <div className="relative z-[1] flex min-h-0 flex-1">
      <VoiceHologramOverlay
        open={voicePanelOpen}
        phase={voicePhase}
        agentName={agent.name}
        agentColor={agent.color}
        micStream={micStream}
        continuousSession={voiceSessionActive}
        onEndCall={endVoiceCall}
      />

      <AgentActivitiesModal
        open={activitiesOpen}
        onClose={() => setActivitiesOpen(false)}
        dashActions={dashActions}
        toolActions={toolActions}
      />

      <aside className="flex w-[280px] shrink-0 flex-col min-h-0 border-r border-aria-border-subtle bg-aria-surface/50 px-[18px] py-[22px] backdrop-blur-sm max-lg:hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        <button
          type="button"
          onClick={() => setActivitiesOpen(true)}
          className="inline-flex h-[30px] items-center gap-1.5 self-start rounded-full border border-aria-border bg-aria-elevated py-0 pr-3 pl-2 text-xs font-medium text-aria-text-secondary transition-colors hover:text-aria-text"
        >
          <Activity className="size-[15px]" />
          Activities
        </button>

        <div className="relative flex flex-col items-center gap-2.5">
          <div
            className="pointer-events-none absolute -top-3.5 size-[150px] rounded-full blur-3xl"
            style={{
              background: `radial-gradient(circle, ${agent.color}66, transparent 65%)`,
            }}
          />
          <AgentAvatar
            assetId={agent.avatarAssetId}
            color={agent.color}
            size={84}
            breathe
            className={avatarAnimClass}
            alt={agent.name}
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
            <div className="flex flex-wrap gap-2">
              {agent.apps.map((app) => (
                <ConnectedAppIcon
                  key={app.name}
                  app={app}
                  capability={capabilityForApp(app.name, agent.capabilities)}
                />
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
        </div>

        <div className="shrink-0 pt-3">
          <AgentEnergyMeter agentId={agent.id} />
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-aria-border-subtle bg-aria-base/40 px-5">
          <AgentAvatar
            assetId={agent.avatarAssetId}
            color={agent.color}
            size={34}
            alt={agent.name}
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
            onClick={() => setActivitiesOpen(true)}
            aria-label="Activities"
            title="Activities"
            className="flex size-[34px] items-center justify-center rounded-[9px] border border-aria-border bg-aria-elevated text-aria-text-secondary transition-colors hover:text-aria-text lg:hidden"
          >
            <Activity className="size-[17px]" />
          </button>
          <button
            type="button"
            onClick={toggleLiveVoice}
            disabled={!canUseVoice || voiceState === "connecting"}
            aria-label={
              !canUseVoice
                ? "Live voice unavailable"
                : voiceEnabled && voiceConnected
                  ? "End live voice session"
                  : voicePanelOpen
                    ? "End live voice session"
                    : "Start live voice"
            }
            title={
              !canUseVoice
                ? agent.voiceAllowed
                  ? "Voice is disabled for this agent"
                  : "Upgrade to Starter to enable live voice"
                : voiceEnabled && voiceConnected
                  ? "End live voice session"
                  : "Start live voice — talk to your agent in real time"
            }
            className={cn("ml-auto", CALL_BTN)}
            style={{
              backgroundColor:
                voicePanelOpen || (voiceEnabled && voiceConnected)
                  ? HANGUP_RED
                  : CALL_GREEN,
            }}
          >
            {voiceState === "connecting" ? (
              <Phone className="size-5 animate-pulse opacity-70" strokeWidth={2.25} />
            ) : voicePanelOpen || voiceEnabled ? (
              <PhoneOff className="size-5" strokeWidth={2.25} />
            ) : (
              <Phone className="size-5" strokeWidth={2.25} />
            )}
          </button>
          <button
            type="button"
            onClick={startNewChat}
            disabled={startingNewChat || isStreaming}
            aria-label="New chat"
            title="New chat"
            className={NEW_CHAT_BTN}
          >
            <MessageSquarePlus className="size-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-label="Toggle chat history"
            title="Chat history"
            className={cn(
              "flex size-[34px] items-center justify-center rounded-[9px] border border-aria-border bg-aria-elevated text-aria-text-secondary transition-colors hover:text-aria-text xl:hidden",
              historyOpen && "border-aria-primary/40 text-aria-primary-light"
            )}
          >
            <History className="size-[17px]" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pt-6 pb-2"
        >
          {historyLoading || loadingThread ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-2xl bg-aria-subtle/50"
                />
              ))}
            </div>
          ) : null}

          {!historyLoading && !loadingThread && messages.length === 0 && (
            <div className="flex flex-col items-start gap-4">
              <div className="flex max-w-[82%] gap-2.5">
                <AgentAvatar
                  assetId={agent.avatarAssetId}
                  color={agent.color}
                  size={30}
                  className="mt-0.5"
                  alt={agent.name}
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
                  aria-label="Talk live"
                  className={cn("self-center", CALL_BTN)}
                  style={{ backgroundColor: CALL_GREEN }}
                >
                  <Phone className="size-5" strokeWidth={2.25} />
                </button>
              )}
            </div>
          )}

          {!historyLoading &&
            !loadingThread &&
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
                    <AgentAvatar
                      assetId={agent.avatarAssetId}
                      color={agent.color}
                      size={30}
                      className="mt-0.5"
                      alt={agent.name}
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
              <AgentAvatar
                assetId={agent.avatarAssetId}
                color={agent.color}
                size={30}
                alt={agent.name}
              />
              <div className="flex gap-1.5 rounded-[18px_18px_18px_4px] border border-aria-border bg-aria-elevated/85 px-4 py-3.5">
                <Dot delay="0s" />
                <Dot delay="0.2s" />
                <Dot delay="0.4s" />
              </div>
            </div>
          )}

          {error && (
            <ChatErrorNotice
              error={error}
              onRetry={
                lastUserMessage ? () => void regenerate() : undefined
              }
            />
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

      <aside
        className={cn(
          "flex w-[300px] shrink-0 flex-col overflow-hidden border-l border-aria-border-subtle bg-aria-surface/50 px-[18px] py-[22px] backdrop-blur-sm",
          historyOpen ? "max-xl:flex" : "max-xl:hidden",
          "xl:flex"
        )}
      >
        <AgentConversationList
          conversations={conversations}
          activeConversationId={conversationId}
          loading={convosLoading}
          switchingId={switchingConvoId}
          onSelect={(id) => void selectConversation(id)}
          onDeleted={handleThreadDeleted}
        />
      </aside>
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

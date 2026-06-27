"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UIMessage } from "ai";

import { AgentChatView } from "@/components/aria/agents/agent-chat-view";
import { getRolePreset } from "@/lib/agents/presets";
import type { Agent } from "@/lib/aria/types";
import { cn } from "@/lib/utils";

interface ChatStepProps {
  agentId: string;
  role?: string;
}

export function ChatStep({ agentId, role }: ChatStepProps) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  const preset = getRolePreset(role ?? "general_assistant");
  const examplePrompts = preset?.examplePrompts?.slice(0, 3) ?? [
    "What can you help me with?",
    "Show me a summary of my day",
  ];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [agentRes, historyRes] = await Promise.all([
          fetch(`/api/agents/${agentId}`),
          fetch(`/api/chat/${agentId}/history`),
        ]);
        if (!agentRes.ok) throw new Error("Failed to load agent");
        const agentData = (await agentRes.json()) as { agent: Agent };
        if (!cancelled) setAgent(agentData.agent);

        if (historyRes.ok) {
          const historyData = (await historyRes.json()) as {
            conversationId: string | null;
            messages: UIMessage[];
          };
          if (!cancelled) {
            setInitialMessages(historyData.messages ?? []);
            setConversationId(historyData.conversationId);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chat");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  async function handleComplete() {
    setCompleting(true);
    setError("");
    try {
      const res = await fetch("/api/user/onboarding", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to complete onboarding");
      }
      router.push((body.redirect as string) ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-sm text-aria-text-muted">
        Loading chat…
      </div>
    );
  }

  if (error && !agent) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-aria-text">
          Say hello to {agent.name}
        </h2>
        <p className="mt-2 text-sm text-aria-text-secondary">
          Try a suggested prompt or ask anything. When you are ready, open your
          dashboard.
        </p>
      </div>

      {examplePrompts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {examplePrompts.map((prompt) => (
            <span
              key={prompt}
              className="rounded-full border border-aria-border bg-aria-elevated/80 px-3 py-1.5 text-xs text-aria-text-secondary"
            >
              {prompt}
            </span>
          ))}
        </div>
      )}

      <div className="h-[min(520px,60vh)] overflow-hidden rounded-2xl border border-aria-border bg-aria-surface shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <AgentChatView
          agent={agent}
          initialMessages={initialMessages}
          initialConversationId={conversationId}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={() => void handleComplete()}
        disabled={completing}
        className={cn(
          "flex h-11 w-full items-center justify-center rounded-full bg-aria-primary text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        )}
      >
        {completing ? "Finishing…" : "Go to dashboard"}
      </button>
    </div>
  );
}

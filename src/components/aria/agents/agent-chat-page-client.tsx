"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { UIMessage } from "ai";

import { AgentChatView } from "@/components/aria/agents/agent-chat-view";
import type { Agent } from "@/lib/aria/types";

export function AgentChatPageClient({ agentId }: { agentId: string }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [agentRes, historyRes] = await Promise.all([
          fetch(`/api/agents/${agentId}`),
          fetch(`/api/chat/${agentId}/history`),
        ]);

        if (agentRes.status === 404) {
          if (!cancelled) setMissing(true);
          return;
        }
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
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHistoryLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-sm text-aria-text-muted">
        Loading agent…
      </div>
    );
  }

  if (missing || !agent) notFound();

  return (
    <AgentChatView
      agent={agent}
      initialMessages={initialMessages}
      initialConversationId={conversationId}
      historyLoading={historyLoading}
    />
  );
}

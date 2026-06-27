"use client";

import { useState } from "react";
import { History, Loader2, Trash2 } from "lucide-react";

import {
  deleteAgentConversation,
  type AgentConversation,
} from "@/hooks/use-agent-conversations";
import { cn } from "@/lib/utils";

function formatThreadTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function threadLabel(convo: AgentConversation): string {
  if (convo.preview) {
    return convo.preview.length > 72
      ? `${convo.preview.slice(0, 72)}…`
      : convo.preview;
  }
  return convo.title || "New chat";
}

export function AgentConversationList({
  conversations,
  activeConversationId,
  loading,
  switchingId,
  onSelect,
  onDeleted,
}: {
  conversations: AgentConversation[];
  activeConversationId: string | null;
  loading?: boolean;
  switchingId?: string | null;
  onSelect: (conversationId: string) => void;
  onDeleted: (conversationId: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (
    e: React.MouseEvent,
    conversationId: string
  ) => {
    e.stopPropagation();
    if (deletingId) return;

    const confirmed = window.confirm(
      "Delete this chat thread? Messages cannot be recovered."
    );
    if (!confirmed) return;

    setDeletingId(conversationId);
    try {
      await deleteAgentConversation(conversationId);
      onDeleted(conversationId);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to delete thread"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <History className="size-4 text-aria-text-muted" />
        <span className="text-[11px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
          Chat history
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-aria-subtle/50"
            />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <p className="text-xs leading-relaxed text-aria-text-muted">
          No threads yet. Start a conversation or tap New chat to create one.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
          {conversations.map((convo) => {
            const active = convo.id === activeConversationId;
            const busy =
              switchingId === convo.id || deletingId === convo.id;

            return (
              <div
                key={convo.id}
                className={cn(
                  "group flex w-full items-start gap-1 rounded-xl border transition-colors",
                  active
                    ? "border-aria-primary/40 bg-aria-primary/10"
                    : "border-aria-border-subtle bg-[#16161f] hover:border-aria-border hover:bg-aria-elevated/80",
                  busy && "opacity-60"
                )}
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSelect(convo.id)}
                  className="min-w-0 flex-1 px-3 py-2.5 text-left"
                >
                  <p
                    className={cn(
                      "truncate text-[13px] font-medium",
                      active ? "text-aria-text" : "text-aria-text-secondary"
                    )}
                  >
                    {threadLabel(convo)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-aria-text-muted">
                    {formatThreadTime(convo.updatedAt)}
                  </p>
                </button>
                {switchingId === convo.id ? (
                  <Loader2 className="mt-3 mr-2 size-4 shrink-0 animate-spin text-aria-text-muted" />
                ) : (
                  <button
                    type="button"
                    aria-label="Delete thread"
                    disabled={Boolean(deletingId)}
                    onClick={(e) => void handleDelete(e, convo.id)}
                    className={cn(
                      "mt-1.5 mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-aria-text-muted opacity-0 transition-opacity hover:bg-aria-danger/10 hover:text-aria-danger group-hover:opacity-100",
                      deletingId === convo.id && "opacity-100"
                    )}
                  >
                    {deletingId === convo.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

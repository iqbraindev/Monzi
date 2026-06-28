"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { useNotifications } from "@/hooks/use-realtime-notifications";
import { useUIStore } from "@/lib/store/ui-store";

export function AgentInsightBar() {
  const { notifications, markRead } = useNotifications();
  const setAgentPanelOpen = useUIStore((s) => s.setAgentPanelOpen);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const latest = notifications.find(
    (n) => !n.read_at && n.id !== dismissedId && n.type === "watch"
  );

  if (!latest) return null;

  return (
    <div className="relative z-20 flex shrink-0 items-center gap-3 border-b border-aria-primary/25 bg-linear-[90deg,rgba(124,58,237,0.14),rgba(6,182,212,0.08)] px-4 py-2.5">
      <span className="aria-gradient size-2 shrink-0 rounded-full shadow-[0_0_8px_rgba(124,58,237,0.6)]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-aria-text">{latest.title}</p>
        <p className="truncate text-[12px] text-aria-text-secondary">{latest.body}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          void markRead(latest.id);
          setAgentPanelOpen(true);
        }}
        className="aria-gradient h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold text-white hover:brightness-110"
      >
        Tell me more
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setDismissedId(latest.id);
          void markRead(latest.id);
        }}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-aria-text-muted hover:bg-aria-subtle hover:text-aria-text"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

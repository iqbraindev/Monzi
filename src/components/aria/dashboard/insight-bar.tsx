"use client";

import { X } from "lucide-react";

import { useUIStore } from "@/lib/store/ui-store";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { getAgent } from "@/lib/aria/mock-data";
import { AgentAvatar } from "@/components/aria/agent-avatar";

export function InsightBar() {
  const dismissed = useDashboardStore((s) => s.insightDismissed);
  const dismiss = useDashboardStore((s) => s.dismissInsight);
  const activeAgentId = useUIStore((s) => s.activeAgentId);
  const agent = getAgent(activeAgentId ?? "nova");

  if (dismissed) return null;

  return (
    <div className="aria-slide-down mx-6 mt-4 shrink-0 flex items-center gap-3.5 rounded-2xl border border-aria-primary/30 bg-aria-primary/10 px-3.5 py-3 backdrop-blur-sm">
      <AgentAvatar
        assetId={agent.avatarAssetId}
        color={agent.color}
        size={34}
        breathe
        alt={agent.name}
      />
      <span className="min-w-0 flex-1 text-sm leading-normal text-aria-text">
        <strong className="font-semibold text-aria-primary-light">
          {agent.name}:
        </strong>{" "}
        You have <strong className="font-semibold">3 unread emails</strong> from
        clients and{" "}
        <strong className="font-semibold text-aria-warning">
          1 overdue invoice
        </strong>
        . Want me to handle them?
      </span>
      <button className="h-8 shrink-0 rounded-full border border-aria-primary/40 bg-aria-primary/15 px-3.5 text-[13px] font-semibold whitespace-nowrap text-aria-primary-light transition-colors hover:bg-aria-primary/30">
        Tell me more
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex size-[30px] shrink-0 items-center justify-center rounded-lg text-aria-text-secondary transition-colors hover:bg-white/5 hover:text-aria-text"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

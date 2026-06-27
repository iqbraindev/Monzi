"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

import { useAgentEnergy } from "@/hooks/use-agent-energy";
import { formatEnergyTokens } from "@/lib/billing/energy";
import { cn } from "@/lib/utils";

function barColor(percent: number): string {
  if (percent >= 90) return "#ef4444";
  if (percent >= 70) return "#f59e0b";
  return "#10b981";
}

export function AgentEnergyMeter({ agentId }: { agentId: string }) {
  const { data, isLoading, isError } = useAgentEnergy(agentId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-aria-border-subtle bg-[#16161f] px-3 py-3">
        <div className="h-10 animate-pulse rounded-lg bg-aria-subtle/50" />
      </div>
    );
  }

  if (isError || !data) return null;

  const usedLabel = formatEnergyTokens(data.used);
  const limitLabel = data.unlimited
    ? "Unlimited"
    : formatEnergyTokens(data.limit);

  return (
    <div className="rounded-xl border border-aria-border-subtle bg-[#16161f] px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-medium text-aria-text">
          <Zap className="size-4 text-aria-warning" />
          Energy credits
        </span>
        <span className="text-[11px] text-aria-text-muted">This month</span>
      </div>

      <p className="mt-2 font-mono text-sm tabular-nums text-aria-text">
        {usedLabel}
        {!data.unlimited && (
          <span className="text-aria-text-muted"> / {limitLabel}</span>
        )}
      </p>

      {!data.unlimited && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-aria-border">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, data.percent)}%`,
              backgroundColor: barColor(data.percent),
            }}
          />
        </div>
      )}

      {!data.unlimited && data.percent >= 90 && (
        <p className="mt-2 text-[11px] leading-snug text-aria-warning">
          Running low.{" "}
          <Link
            href={`/agents/${agentId}/settings`}
            className="underline hover:text-aria-text"
          >
            Raise limit
          </Link>{" "}
          or upgrade your plan.
        </p>
      )}

      {data.unlimited && (
        <p className="mt-1.5 text-[11px] text-aria-text-muted">
          Unlimited energy on your plan
        </p>
      )}
    </div>
  );
}

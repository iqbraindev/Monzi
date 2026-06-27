"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { UsageLeaderboardRow } from "@/lib/admin/types";

async function fetchUsage(): Promise<{
  totals: {
    ai_messages_used: number;
    ai_tokens_used: number;
    ai_cost_usd: number;
    active_users_with_usage: number;
  };
  leaderboard: UsageLeaderboardRow[];
}> {
  const res = await fetch("/api/admin/usage");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load usage");
  }
  return res.json();
}

export function UsagePanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "usage"],
    queryFn: fetchUsage,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load usage"}
        </div>
      </div>
    );
  }

  const { totals, leaderboard } = data;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
      <AdminPageHeader
        icon={Activity}
        title="AI usage"
        description="Platform-wide message volume, token consumption, and top users this month."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Messages"
          value={totals.ai_messages_used.toLocaleString()}
        />
        <MetricCard
          label="Tokens"
          value={totals.ai_tokens_used.toLocaleString()}
        />
        <MetricCard
          label="Est. cost"
          value={`$${totals.ai_cost_usd.toFixed(2)}`}
        />
        <MetricCard
          label="Active users"
          value={totals.active_users_with_usage.toLocaleString()}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-aria-border bg-aria-surface/70">
        <div className="border-b border-aria-border px-4 py-3">
          <h2 className="font-heading text-base font-semibold text-aria-text">
            Top users this month
          </h2>
        </div>
        <div className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.5fr] gap-3 border-b border-[#16161f] bg-[#16161f] px-4 py-3 text-[11px] font-semibold tracking-wide text-aria-text-secondary uppercase">
          <span>User</span>
          <span>Messages</span>
          <span>Tokens</span>
          <span>Cost</span>
        </div>
        {leaderboard.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-aria-text-secondary">
            No usage recorded this month.
          </div>
        ) : (
          leaderboard.map((row) => (
            <div
              key={row.user_id}
              className="grid grid-cols-[1.2fr_0.5fr_0.5fr_0.5fr] items-center gap-3 border-b border-[#16161f] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-aria-text">
                  {row.full_name || "Unnamed user"}
                </p>
                <p className="text-xs text-aria-text-muted">{row.email}</p>
              </div>
              <span className="font-mono text-sm text-aria-text">
                {row.ai_messages_used}
              </span>
              <span className="font-mono text-sm text-aria-text">
                {row.ai_tokens_used.toLocaleString()}
              </span>
              <span className="font-mono text-sm text-aria-text">
                ${row.ai_cost_usd.toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-aria-border bg-aria-surface/70 p-5">
      <p className="text-xs font-semibold tracking-wide text-aria-text-secondary uppercase">
        {label}
      </p>
      <p className="mt-2 font-heading text-2xl font-bold text-aria-text">
        {value}
      </p>
    </div>
  );
}

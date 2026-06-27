"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Loader2,
  LayoutDashboard,
  Users,
  DollarSign,
  Bot,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { PlatformStats } from "@/lib/admin/types";

async function fetchStats(): Promise<PlatformStats> {
  const res = await fetch("/api/admin/stats");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load stats");
  }
  const data = (await res.json()) as { stats: PlatformStats };
  return data.stats;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-aria-border bg-aria-surface/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-aria-text-secondary uppercase">
          {label}
        </span>
        <Icon className="size-4 text-amber-400/80" />
      </div>
      <p className="font-heading text-2xl font-bold text-aria-text">{value}</p>
      {hint && (
        <p className="mt-1 text-xs text-aria-text-muted">{hint}</p>
      )}
    </div>
  );
}

export function StatsOverview() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchStats,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load overview"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
      <AdminPageHeader
        icon={LayoutDashboard}
        title="Platform overview"
        description="Monitor growth, revenue, and AI usage across all Monzi workspaces."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={stats.totalUsers.toLocaleString()}
          hint={`${stats.newUsersThisMonth} new this month`}
          icon={Users}
        />
        <StatCard
          label="MRR"
          value={`$${stats.mrr.toLocaleString()}`}
          hint={`${stats.activeSubscriptions} active subscriptions`}
          icon={DollarSign}
        />
        <StatCard
          label="AI messages"
          value={stats.aiMessagesThisMonth.toLocaleString()}
          hint={`$${stats.aiCostThisMonth.toFixed(2)} est. cost this month`}
          icon={MessageSquare}
        />
        <StatCard
          label="Agents"
          value={stats.totalAgents.toLocaleString()}
          hint={`${stats.totalSubaccounts} subaccounts`}
          icon={Bot}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-aria-border bg-aria-surface/70 p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-400" />
            <h2 className="font-heading text-base font-semibold text-aria-text">
              Account health
            </h2>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Metric label="Active users" value={stats.activeUsers} />
            <Metric label="Suspended" value={stats.suspendedUsers} />
            <Metric
              label="Tokens this month"
              value={stats.aiTokensThisMonth.toLocaleString()}
            />
            <Metric label="Subaccounts" value={stats.totalSubaccounts} />
          </dl>
        </div>

        <div className="rounded-2xl border border-aria-border bg-aria-surface/70 p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-400" />
            <h2 className="font-heading text-base font-semibold text-aria-text">
              Quick actions
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            <QuickLink href="/admin/users" label="Manage users & suspensions" />
            <QuickLink href="/admin/packs" label="Edit subscription packages" />
            <QuickLink href="/admin/billing" label="Review revenue breakdown" />
            <QuickLink href="/admin/usage" label="Inspect AI usage by user" />
            <QuickLink href="/admin/audit" label="View platform audit log" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-aria-text-muted">{label}</dt>
      <dd className="font-mono text-lg font-semibold text-aria-text">{value}</dd>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-aria-border bg-aria-elevated/50 px-4 py-3 text-sm font-medium text-aria-text transition-colors hover:border-amber-500/30 hover:bg-amber-500/5"
    >
      {label}
    </Link>
  );
}

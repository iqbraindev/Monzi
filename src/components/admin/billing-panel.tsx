"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, Loader2 } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { BillingBreakdown } from "@/lib/admin/types";

async function fetchBilling(): Promise<BillingBreakdown> {
  const res = await fetch("/api/admin/billing");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load billing");
  }
  const data = (await res.json()) as { billing: BillingBreakdown };
  return data.billing;
}

export function BillingPanel() {
  const { data: billing, isLoading, error } = useQuery({
    queryKey: ["admin", "billing"],
    queryFn: fetchBilling,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load billing"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
      <AdminPageHeader
        icon={CreditCard}
        title="Billing & revenue"
        description="Track MRR, subscription health, and revenue distribution by package."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="MRR" value={`$${billing.mrr.toLocaleString()}`} />
        <MetricCard label="ARR" value={`$${billing.arr.toLocaleString()}`} />
        <MetricCard
          label="Active subs"
          value={billing.activeSubscriptions.toString()}
        />
        <MetricCard
          label="Past due"
          value={billing.pastDueSubscriptions.toString()}
          warn={billing.pastDueSubscriptions > 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-aria-border bg-aria-surface/70 p-5">
          <h2 className="mb-4 font-heading text-base font-semibold text-aria-text">
            Subscription status
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Row label="Trialing" value={billing.trialingSubscriptions} />
            <Row label="Canceled this month" value={billing.canceledThisMonth} />
            <Row label="Active" value={billing.activeSubscriptions} />
            <Row label="Past due" value={billing.pastDueSubscriptions} />
          </dl>
        </div>

        <div className="overflow-hidden rounded-2xl border border-aria-border bg-aria-surface/70">
          <div className="border-b border-aria-border px-4 py-3">
            <h2 className="font-heading text-base font-semibold text-aria-text">
              Revenue by package
            </h2>
          </div>
          <div className="grid grid-cols-[1fr_0.5fr_0.5fr] gap-3 border-b border-[#16161f] bg-[#16161f] px-4 py-3 text-[11px] font-semibold tracking-wide text-aria-text-secondary uppercase">
            <span>Package</span>
            <span>Subs</span>
            <span>MRR</span>
          </div>
          {billing.revenueByPack.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-aria-text-secondary">
              No paid subscriptions yet.
            </div>
          ) : (
            billing.revenueByPack.map((row) => (
              <div
                key={row.pack_slug}
                className="grid grid-cols-[1fr_0.5fr_0.5fr] items-center gap-3 border-b border-[#16161f] px-4 py-3"
              >
                <span className="text-sm font-medium text-aria-text">
                  {row.pack_name}
                </span>
                <span className="font-mono text-sm text-aria-text">
                  {row.count}
                </span>
                <span className="font-mono text-sm text-aria-text">
                  ${row.mrr.toFixed(0)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-aria-border bg-aria-surface/70 p-5">
      <p className="text-xs font-semibold tracking-wide text-aria-text-secondary uppercase">
        {label}
      </p>
      <p
        className={`mt-2 font-heading text-2xl font-bold ${warn ? "text-red-300" : "text-aria-text"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-aria-text-muted">{label}</dt>
      <dd className="font-mono text-lg font-semibold text-aria-text">{value}</dd>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { useLimits } from "@/hooks/use-workspaces";
import { useBilling } from "@/hooks/use-billing";
import {
  barClassForUrgency,
  computeSidebarUsageState,
  urgencyDotClass,
} from "@/lib/billing/sidebar-usage";
import { cn } from "@/lib/utils";

interface SidebarUsageMeterProps {
  expanded: boolean;
}

export function SidebarUsageMeter({ expanded }: SidebarUsageMeterProps) {
  const { data: limitsData } = useLimits();
  const { data: billing } = useBilling();

  const planName = billing?.pack?.name ?? "Free";
  const planSlug = billing?.pack?.slug ?? "free";
  const nextPlanSlug =
    planSlug === "free"
      ? "starter"
      : planSlug === "starter"
        ? "pro"
        : planSlug === "pro"
          ? "business"
          : null;
  const nextPack = billing?.availablePacks?.find((p) => p.slug === nextPlanSlug);
  const nextPlanPrice =
    nextPack?.price_monthly ??
    (nextPlanSlug === "starter" ? 19 : nextPlanSlug === "pro" ? 49 : nextPlanSlug === "business" ? 99 : null);
  const nextPlanName =
    nextPlanSlug === "starter"
      ? "Starter"
      : nextPlanSlug === "pro"
        ? "Pro"
        : nextPlanSlug === "business"
          ? "Business"
          : null;

  const state = computeSidebarUsageState({
    limitsData,
    planName,
    planSlug,
    nextPlanPrice,
  });

  const primary = state.primary;
  const upgradeHref = state.nextPlanSlug
    ? `/billing?upgrade=${state.nextPlanSlug}`
    : "/billing";

  const tooltip = primary
    ? `${state.planName} · ${primary.used}/${primary.max} ${primary.shortLabel}`
    : `${state.planName} plan`;

  if (!expanded) {
    return (
      <Link
        href={upgradeHref}
        title={state.canUpgrade ? `Upgrade to ${nextPlanName}` : tooltip}
        className="mx-auto flex size-10 items-center justify-center rounded-[10px] transition-colors hover:bg-aria-elevated"
      >
        <span
          className={cn(
            "size-2.5 rounded-full ring-2 ring-aria-border",
            urgencyDotClass(state.urgency)
          )}
        />
      </Link>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2.5 rounded-xl border border-aria-border/60 bg-aria-elevated/40 p-2.5">
      <Link
        href="/billing"
        className="group flex flex-col gap-2 transition-opacity hover:opacity-90"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-aria-primary/30 bg-aria-primary/15 px-2.5 py-0.5 text-xs font-semibold text-aria-primary-light">
            {state.planName} Plan
          </span>
          {primary && (
            <span className="font-mono text-[11px] text-aria-text-secondary">
              {primary.used.toLocaleString()} / {primary.max.toLocaleString()}
            </span>
          )}
        </div>

        {primary && (
          <>
            <p className="text-[11px] capitalize text-aria-text-muted">
              {primary.label} this month
            </p>
            <div className="h-[5px] overflow-hidden rounded-full bg-aria-subtle">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  barClassForUrgency(state.urgency)
                )}
                style={{ width: `${Math.max(primary.percent, primary.used > 0 ? 4 : 0)}%` }}
              />
            </div>
          </>
        )}

        {state.upgradeMessage && (
          <p className="text-[11px] leading-snug text-aria-warning">
            {state.upgradeMessage}
          </p>
        )}
      </Link>

      {state.canUpgrade && state.nextPlanName && (
        <Link
          href={upgradeHref}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-[9px] bg-aria-primary text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(124,58,237,0.35)] transition-opacity hover:opacity-90"
        >
          Upgrade to {state.nextPlanName}
          {state.nextPlanPrice != null && (
            <span className="text-[11px] font-medium text-white/80">
              · ${Number(state.nextPlanPrice).toFixed(0)}/mo
            </span>
          )}
          <ArrowUpRight className="size-3.5 opacity-80" />
        </Link>
      )}
    </div>
  );
}

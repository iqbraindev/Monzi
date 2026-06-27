"use client";

import { Check, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPackFeatures } from "@/lib/billing/plan-features";
import type { Pack } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  pack: Pack;
  cycle: "monthly" | "yearly";
  isCurrent: boolean;
  isPopular?: boolean;
  isLoading?: boolean;
  onSelect: () => void;
  compact?: boolean;
}

export function PlanCard({
  pack,
  cycle,
  isCurrent,
  isPopular = false,
  isLoading = false,
  onSelect,
  compact = false,
}: PlanCardProps) {
  const price =
    cycle === "yearly" ? pack.price_yearly : pack.price_monthly;
  const monthlyEquivalent =
    cycle === "yearly" && Number(price) > 0
      ? Math.round(Number(price) / 12)
      : null;
  const features = getPackFeatures(pack.limits ?? {
    max_workspaces: 1,
    max_agents: 1,
    max_subaccounts: 0,
    ai_messages_per_month: 50,
    ai_messages_per_day: 10,
    max_dashboards: 1,
    max_widgets_per_dashboard: 5,
    max_integrations: 1,
    voice_enabled: false,
    custom_avatar_enabled: false,
    storage_mb: 100,
    agent_energy_default: 25_000,
    agent_energy_max: 50_000,
    support_level: "community",
  }).filter((f) => f.included);
  const isFree = pack.slug === "free";

  return (
    <article
      className={cn(
        "flex h-full min-w-[240px] flex-col rounded-2xl border transition-all",
        compact ? "p-4" : "p-5 sm:p-6",
        isCurrent
          ? "border-aria-primary/60 bg-aria-primary/8 shadow-[0_0_0_1px_rgba(124,58,237,0.25)]"
          : isPopular
            ? "border-aria-primary/40 bg-aria-surface/90 shadow-lg shadow-aria-primary/10"
            : "border-aria-border bg-aria-elevated/40 hover:border-aria-border-subtle hover:bg-aria-elevated/60"
      )}
    >
      {(isPopular || isCurrent) && (
        <span
          className={cn(
            "mb-3 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
            isCurrent
              ? "border border-aria-primary/40 bg-aria-primary text-white"
              : "border border-aria-primary/30 bg-[#1a1033] text-aria-primary-light"
          )}
        >
          {isCurrent ? (
            "Current plan"
          ) : (
            <>
              <Sparkles className="size-3" />
              Popular
            </>
          )}
        </span>
      )}

      <div className={cn("mb-4", !(isPopular || isCurrent) && "pt-1")}>
        <h3
          className={cn(
            "font-heading font-bold text-aria-text",
            compact ? "text-lg" : "text-xl"
          )}
        >
          {pack.name}
        </h3>
        {pack.description && !compact && (
          <p className="mt-1.5 text-sm leading-relaxed text-aria-text-secondary">
            {pack.description}
          </p>
        )}
        {pack.description && compact && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-aria-text-secondary">
            {pack.description}
          </p>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              "font-heading font-bold tracking-tight text-aria-text",
              compact ? "text-3xl" : "text-4xl"
            )}
          >
            ${Number(price).toFixed(0)}
          </span>
          <span className="text-xs text-aria-text-muted">
            /{cycle === "yearly" ? "yr" : "mo"}
          </span>
        </div>
        {monthlyEquivalent && (
          <p className="mt-0.5 text-[11px] text-aria-text-muted">
            ${monthlyEquivalent}/mo billed annually
          </p>
        )}
        {cycle === "yearly" && !isFree && (
          <p className="mt-0.5 text-[11px] font-medium text-aria-success">
            Save ~17%
          </p>
        )}
      </div>

      <ul className={cn("mb-4 flex flex-1 flex-col", compact ? "gap-1.5" : "gap-2")}>
        {features.map((feature) => (
          <li
            key={feature.label}
            className={cn(
              "flex items-start gap-2 leading-snug text-slate-300",
              compact ? "text-xs" : "text-[13px]"
            )}
          >
            <Check className="mt-0.5 size-3.5 shrink-0 text-aria-success" />
            <span>{feature.label}</span>
          </li>
        ))}
      </ul>

      <Button
        className={cn(
          "mt-auto w-full rounded-full font-semibold",
          compact ? "h-9 text-xs" : "h-10 text-[13px]",
          !isCurrent && !isFree && isPopular && "bg-aria-primary hover:bg-aria-primary/90"
        )}
        variant={isCurrent ? "outline" : isFree ? "outline" : "default"}
        disabled={isCurrent || isLoading || isFree}
        onClick={onSelect}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isCurrent ? (
          "Your current plan"
        ) : isFree ? (
          "Included for everyone"
        ) : (
          `Upgrade to ${pack.name}`
        )}
      </Button>
    </article>
  );
}

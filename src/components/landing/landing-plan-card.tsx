import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPackFeatures } from "@/lib/billing/plan-features";
import type { Pack } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

interface LandingPlanCardProps {
  pack: Pack;
  isPopular?: boolean;
}

export function LandingPlanCard({ pack, isPopular = false }: LandingPlanCardProps) {
  const features = getPackFeatures(
    pack.limits ?? {
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
    }
  ).filter((f) => f.included);

  const isFree = pack.slug === "free";
  const price = pack.price_monthly;

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border p-5 sm:p-6",
        isPopular
          ? "border-aria-primary/40 bg-aria-surface shadow-lg shadow-aria-primary/10"
          : "border-aria-border bg-aria-elevated/40"
      )}
    >
      {isPopular && (
        <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full border border-aria-primary/30 bg-[#1a1033] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-aria-primary-light">
          <Sparkles className="size-3" />
          Popular
        </span>
      )}

      <div className={cn("mb-4", !isPopular && "pt-1")}>
        <h3 className="font-heading text-xl font-bold text-aria-text">
          {pack.name}
        </h3>
        {pack.description && (
          <p className="mt-1.5 text-sm text-aria-text-secondary">
            {pack.description}
          </p>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="font-heading text-4xl font-bold tracking-tight text-aria-text">
            ${Number(price).toFixed(0)}
          </span>
          <span className="text-xs text-aria-text-muted">/mo</span>
        </div>
        {!isFree && (
          <p className="mt-0.5 text-[11px] text-aria-text-muted">
            Upgrade anytime in the app
          </p>
        )}
      </div>

      <ul className="mb-6 flex flex-1 flex-col gap-2">
        {features.slice(0, 6).map((feature) => (
          <li
            key={feature.label}
            className="flex items-start gap-2 text-[13px] leading-snug text-slate-300"
          >
            <Check className="mt-0.5 size-3.5 shrink-0 text-aria-success" />
            <span>{feature.label}</span>
          </li>
        ))}
      </ul>

      <Link href="/sign-up" className="mt-auto">
        <Button
          className={cn(
            "w-full rounded-full font-semibold",
            isPopular
              ? "border-transparent bg-aria-primary text-white hover:bg-aria-primary/90"
              : "border-aria-border bg-aria-elevated text-aria-text hover:bg-aria-subtle hover:text-aria-text"
          )}
          variant="outline"
        >
          {isFree ? "Start free" : "Get started"}
        </Button>
      </Link>
    </article>
  );
}

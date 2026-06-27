"use client";

import Link from "next/link";

import {
  BuilderField,
} from "@/components/aria/agents/builder/agent-builder-shell";
import type { AgentBuilderDraft } from "@/lib/agents/form-types";
import { formatEnergyTokens } from "@/lib/billing/energy";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Light", ratio: 0.25 },
  { label: "Standard", ratio: 0.5 },
  { label: "Heavy", ratio: 1 },
] as const;

interface EnergyLimitFieldsProps {
  draft: AgentBuilderDraft;
  planDefault: number;
  planMax: number;
  onChange: (patch: Partial<AgentBuilderDraft>) => void;
}

export function EnergyLimitFields({
  draft,
  planDefault,
  planMax,
  onChange,
}: EnergyLimitFieldsProps) {
  const unlimited = planMax < 0;
  const min = 5_000;
  const max = unlimited ? Math.max(draft.energy_limit_monthly, 2_000_000) : planMax;
  const value = unlimited
    ? draft.energy_limit_monthly
    : Math.min(Math.max(draft.energy_limit_monthly, min), max);

  const setValue = (next: number) => {
    onChange({ energy_limit_monthly: next });
  };

  return (
    <div className="flex flex-col gap-5">
      <BuilderField label="Monthly energy budget">
        <p className="text-sm leading-relaxed text-aria-text-secondary">
          Energy credits are tokens this agent can use each month for chat and
          tools. Your plan controls the maximum you can allocate per agent.
        </p>
      </BuilderField>

      {!unlimited && (
        <p className="text-xs text-aria-text-muted">
          Plan allowance: up to {formatEnergyTokens(planMax)} per agent · default{" "}
          {formatEnergyTokens(planDefault)}
        </p>
      )}

      <BuilderField label={`Budget (${formatEnergyTokens(value)} tokens / month)`}>
        <input
          type="range"
          min={min}
          max={max}
          step={unlimited ? 10_000 : Math.max(1_000, Math.floor(max / 100))}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full accent-aria-primary"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const presetValue = unlimited
              ? planDefault * (preset.ratio === 1 ? 4 : preset.ratio === 0.5 ? 2 : 1)
              : Math.round(planMax * preset.ratio);
            const active = value === presetValue;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setValue(presetValue)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-aria-primary/50 bg-aria-primary/15 text-aria-text"
                    : "border-aria-border text-aria-text-secondary hover:text-aria-text"
                )}
              >
                {preset.label}
              </button>
            );
          })}
          {!unlimited && (
            <button
              type="button"
              onClick={() => setValue(planMax)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                value === planMax
                  ? "border-aria-primary/50 bg-aria-primary/15 text-aria-text"
                  : "border-aria-border text-aria-text-secondary hover:text-aria-text"
              )}
            >
              Max plan
            </button>
          )}
        </div>
      </BuilderField>

      <p className="text-xs text-aria-text-muted">
        When energy runs out, this agent pauses until next month or you increase
        the limit.{" "}
        <Link href="/billing" className="text-aria-primary-light underline">
          View plan
        </Link>
      </p>
    </div>
  );
}

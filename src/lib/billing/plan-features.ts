import { formatEnergyTokens } from "@/lib/billing/energy";
import type { PackLimits } from "@/lib/billing/types";

export function formatPlanLimit(value: number, suffix = ""): string {
  if (value < 0) return "Unlimited";
  return `${value.toLocaleString()}${suffix}`;
}

export interface PlanFeature {
  label: string;
  included: boolean;
}

export function getPackFeatures(limits: PackLimits): PlanFeature[] {
  return [
    {
      label: `${formatPlanLimit(limits.max_agents)} AI agents`,
      included: true,
    },
    {
      label: `${formatPlanLimit(limits.ai_messages_per_month)} messages / month`,
      included: true,
    },
    {
      label: `${formatPlanLimit(limits.max_integrations)} integrations`,
      included: true,
    },
    {
      label: `${formatPlanLimit(limits.max_dashboards)} dashboards`,
      included: limits.max_dashboards !== 0,
    },
    {
      label: `${formatEnergyTokens(limits.agent_energy_default)} energy / agent`,
      included: true,
    },
    {
      label: "Voice conversations",
      included: limits.voice_enabled,
    },
    {
      label: "Custom agent avatars",
      included: limits.custom_avatar_enabled,
    },
    {
      label: `${formatPlanLimit(limits.max_subaccounts)} team seats`,
      included: limits.max_subaccounts > 0,
    },
    {
      label: `${formatPlanLimit(limits.storage_mb, " MB")} storage`,
      included: true,
    },
    {
      label: `${limits.support_level} support`,
      included: true,
    },
  ];
}

export function getPackFeatureLabels(limits: PackLimits): string[] {
  return getPackFeatures(limits)
    .filter((f) => f.included)
    .map((f) => f.label);
}

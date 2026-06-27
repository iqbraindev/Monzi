import type { DbAgent } from "@/lib/agents/adapter";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface PlanEnergyLimits {
  defaultMonthly: number;
  maxMonthly: number;
}

export interface AgentEnergyStats {
  used: number;
  limit: number;
  percent: number;
  periodStart: string;
  periodEnd: string;
  unlimited: boolean;
}

function monthPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export function formatEnergyTokens(value: number): string {
  if (value < 0) return "Unlimited";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return value.toLocaleString();
}

export async function getPlanEnergyLimits(
  userId: string
): Promise<PlanEnergyLimits> {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.MONZI_VOICE_DEV === "true"
  ) {
    return { defaultMonthly: 200_000, maxMonthly: -1 };
  }

  const supabase = getSupabaseAdmin();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("pack_id, custom_limits")
    .eq("user_id", userId)
    .single();

  const custom = subscription?.custom_limits as {
    agent_energy_default?: number;
    agent_energy_max?: number;
  } | null;

  if (!subscription?.pack_id) {
    return {
      defaultMonthly: custom?.agent_energy_default ?? 25_000,
      maxMonthly: custom?.agent_energy_max ?? 50_000,
    };
  }

  const { data: limits } = await supabase
    .from("pack_limits")
    .select("agent_energy_default, agent_energy_max")
    .eq("pack_id", subscription.pack_id)
    .single();

  return {
    defaultMonthly:
      custom?.agent_energy_default ?? limits?.agent_energy_default ?? 50_000,
    maxMonthly: custom?.agent_energy_max ?? limits?.agent_energy_max ?? 200_000,
  };
}

export function resolveAgentEnergyLimit(
  agent: Pick<DbAgent, "energy_limit_monthly">,
  plan: PlanEnergyLimits
): number {
  const raw = agent.energy_limit_monthly ?? plan.defaultMonthly;
  if (plan.maxMonthly >= 0 && raw > plan.maxMonthly) return plan.maxMonthly;
  return raw;
}

export function clampEnergyLimitForPlan(
  requested: number,
  plan: PlanEnergyLimits
): number {
  if (requested < 1_000) return Math.max(1_000, plan.defaultMonthly);
  if (plan.maxMonthly >= 0 && requested > plan.maxMonthly) return plan.maxMonthly;
  return requested;
}

export async function getAgentEnergyUsage(
  workspaceId: string,
  agentId: string
): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { start } = monthPeriod();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("agent_id", agentId);

  const ids = (conversations ?? []).map((c) => c.id);
  if (ids.length === 0) return 0;

  const { data: messages } = await supabase
    .from("messages")
    .select("tokens_used")
    .in("conversation_id", ids)
    .gte("created_at", start);

  return (messages ?? []).reduce(
    (sum, row) => sum + (row.tokens_used ?? 0),
    0
  );
}

export async function getAgentEnergyStats(
  ownerUserId: string,
  workspaceId: string,
  agent: DbAgent
): Promise<AgentEnergyStats> {
  const plan = await getPlanEnergyLimits(ownerUserId);
  const limit = resolveAgentEnergyLimit(agent, plan);
  const used = await getAgentEnergyUsage(workspaceId, agent.id);
  const { start, end } = monthPeriod();
  const unlimited = limit < 0;

  return {
    used,
    limit,
    percent: unlimited ? 0 : limit > 0 ? Math.min(100, (used / limit) * 100) : 100,
    periodStart: start,
    periodEnd: end,
    unlimited,
  };
}

export async function assertAgentHasEnergy(
  ownerUserId: string,
  workspaceId: string,
  agent: DbAgent
): Promise<{ ok: true } | { ok: false; message: string }> {
  const stats = await getAgentEnergyStats(ownerUserId, workspaceId, agent);
  if (stats.unlimited) return { ok: true };
  if (stats.used >= stats.limit) {
    return {
      ok: false,
      message:
        "This agent has used all of its energy credits for this month. Increase the limit in agent settings or upgrade your plan.",
    };
  }
  return { ok: true };
}

export async function incrementWorkspaceTokenUsage(
  workspaceId: string,
  ownerUserId: string,
  tokens: number
): Promise<void> {
  if (tokens <= 0) return;

  const supabase = getSupabaseAdmin();
  const { start, end } = monthPeriod();

  const { data: existing } = await supabase
    .from("usage_tracking")
    .select("id, ai_tokens_used")
    .eq("workspace_id", workspaceId)
    .eq("period_start", start)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("usage_tracking")
      .update({
        ai_tokens_used: (existing.ai_tokens_used ?? 0) + tokens,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("usage_tracking").insert({
      user_id: ownerUserId,
      workspace_id: workspaceId,
      period_start: start,
      period_end: end,
      ai_tokens_used: tokens,
    });
  }
}

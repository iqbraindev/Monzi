import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type { AuditLogEntry, UsageLeaderboardRow } from "@/lib/admin/types";

function monthPeriodStart(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
}

export async function getUsageLeaderboard(
  limit = 25
): Promise<UsageLeaderboardRow[]> {
  const supabase = getSupabaseAdmin();
  const periodStart = monthPeriodStart();

  const { data: rows } = await supabase
    .from("usage_tracking")
    .select(
      "user_id, ai_messages_used, ai_tokens_used, ai_cost_usd, users ( email, full_name )"
    )
    .eq("period_start", periodStart)
    .order("ai_messages_used", { ascending: false })
    .limit(limit);

  return (rows ?? []).map((row) => {
    const user = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      user_id: row.user_id,
      email: user?.email ?? "unknown",
      full_name: user?.full_name ?? null,
      ai_messages_used: row.ai_messages_used ?? 0,
      ai_tokens_used: Number(row.ai_tokens_used ?? 0),
      ai_cost_usd: Number(row.ai_cost_usd ?? 0),
    };
  });
}

export async function getPlatformUsageTotals(): Promise<{
  ai_messages_used: number;
  ai_tokens_used: number;
  ai_cost_usd: number;
  active_users_with_usage: number;
}> {
  const supabase = getSupabaseAdmin();
  const periodStart = monthPeriodStart();

  const { data: rows } = await supabase
    .from("usage_tracking")
    .select("ai_messages_used, ai_tokens_used, ai_cost_usd")
    .eq("period_start", periodStart);

  let ai_messages_used = 0;
  let ai_tokens_used = 0;
  let ai_cost_usd = 0;
  let active_users_with_usage = 0;

  for (const row of rows ?? []) {
    const messages = row.ai_messages_used ?? 0;
    if (messages > 0) active_users_with_usage += 1;
    ai_messages_used += messages;
    ai_tokens_used += Number(row.ai_tokens_used ?? 0);
    ai_cost_usd += Number(row.ai_cost_usd ?? 0);
  }

  return {
    ai_messages_used,
    ai_tokens_used,
    ai_cost_usd: Math.round(ai_cost_usd * 100) / 100,
    active_users_with_usage,
  };
}

export async function listAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  const supabase = getSupabaseAdmin();

  const { data: rows } = await supabase
    .from("audit_log")
    .select(
      "id, actor_id, target_type, target_id, action, payload, created_at, users:actor_id ( email )"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return (rows ?? []).map((row) => {
    const actor = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      id: row.id,
      actor_id: row.actor_id,
      actor_email: actor?.email ?? null,
      target_type: row.target_type,
      target_id: row.target_id,
      action: row.action,
      payload: (row.payload as Record<string, unknown> | null) ?? null,
      created_at: row.created_at,
    };
  });
}

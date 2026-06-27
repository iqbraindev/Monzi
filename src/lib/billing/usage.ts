import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type { UsageSnapshot } from "@/lib/billing/types";

function monthPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getCurrentUsage(userId: string): Promise<UsageSnapshot> {
  const { start, end } = monthPeriod();
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", start)
    .maybeSingle();

  if (data) {
    return {
      ai_messages_used: data.ai_messages_used ?? 0,
      ai_tokens_used: Number(data.ai_tokens_used ?? 0),
      integrations_connected: data.integrations_connected ?? 0,
      agents_created: data.agents_created ?? 0,
      period_start: data.period_start,
      period_end: data.period_end,
    };
  }

  return {
    ai_messages_used: 0,
    ai_tokens_used: 0,
    integrations_connected: 0,
    agents_created: 0,
    period_start: start,
    period_end: end,
  };
}

export async function resetMonthlyUsage(userId: string): Promise<void> {
  const { start, end } = monthPeriod();
  const supabase = getSupabaseAdmin();

  await supabase.from("usage_tracking").upsert(
    {
      user_id: userId,
      period_start: start,
      period_end: end,
      ai_messages_used: 0,
      ai_tokens_used: 0,
    },
    { onConflict: "user_id,period_start" }
  );
}

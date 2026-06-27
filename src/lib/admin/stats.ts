import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type { PlatformStats } from "@/lib/admin/types";

function monthPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = getSupabaseAdmin();
  const { start, end } = monthPeriod();

  const [
    usersRes,
    activeRes,
    suspendedRes,
    subaccountsRes,
    agentsRes,
    subsRes,
    usageRes,
    newUsersRes,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .neq("role", "super_admin"),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("is_suspended", false)
      .neq("role", "super_admin"),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_suspended", true),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "subaccount"),
    supabase.from("agents").select("*", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("status, billing_cycle, pack:packs(price_monthly, price_yearly)")
      .in("status", ["active", "trialing"]),
    supabase
      .from("usage_tracking")
      .select("ai_messages_used, ai_tokens_used, ai_cost_usd")
      .eq("period_start", start),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .neq("role", "super_admin")
      .gte("created_at", start)
      .lt("created_at", end),
  ]);

  let mrr = 0;
  let activeSubscriptions = 0;

  for (const sub of subsRes.data ?? []) {
    if (sub.status !== "active") continue;
    activeSubscriptions += 1;
    const pack = Array.isArray(sub.pack) ? sub.pack[0] : sub.pack;
    if (!pack) continue;
    const monthly = Number(pack.price_monthly ?? 0);
    const yearly = Number(pack.price_yearly ?? 0);
    mrr +=
      sub.billing_cycle === "yearly" ? yearly / 12 : monthly;
  }

  let aiMessagesThisMonth = 0;
  let aiTokensThisMonth = 0;
  let aiCostThisMonth = 0;

  for (const row of usageRes.data ?? []) {
    aiMessagesThisMonth += row.ai_messages_used ?? 0;
    aiTokensThisMonth += Number(row.ai_tokens_used ?? 0);
    aiCostThisMonth += Number(row.ai_cost_usd ?? 0);
  }

  return {
    totalUsers: usersRes.count ?? 0,
    activeUsers: activeRes.count ?? 0,
    suspendedUsers: suspendedRes.count ?? 0,
    totalSubaccounts: subaccountsRes.count ?? 0,
    activeSubscriptions,
    mrr: Math.round(mrr * 100) / 100,
    totalAgents: agentsRes.count ?? 0,
    aiMessagesThisMonth,
    aiTokensThisMonth,
    aiCostThisMonth: Math.round(aiCostThisMonth * 100) / 100,
    newUsersThisMonth: newUsersRes.count ?? 0,
  };
}

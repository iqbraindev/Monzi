import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getUserIntegrationLimit(
  userId: string
): Promise<number> {
  if (process.env.NODE_ENV === "development") {
    return -1;
  }

  const supabase = getSupabaseAdmin();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("pack_id, custom_limits")
    .eq("user_id", userId)
    .single();

  const customMax = (
    subscription?.custom_limits as { max_integrations?: number } | null
  )?.max_integrations;

  if (typeof customMax === "number") return customMax;

  if (!subscription?.pack_id) return 1;

  const { data: limits } = await supabase
    .from("pack_limits")
    .select("max_integrations")
    .eq("pack_id", subscription.pack_id)
    .single();

  return limits?.max_integrations ?? 1;
}

export async function incrementIntegrationsConnected(userId: string) {
  const supabase = getSupabaseAdmin();
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  const { data: existing } = await supabase
    .from("usage_tracking")
    .select("id, integrations_connected")
    .eq("user_id", userId)
    .eq("period_start", periodStart.toISOString())
    .maybeSingle();

  if (existing) {
    await supabase
      .from("usage_tracking")
      .update({
        integrations_connected: (existing.integrations_connected ?? 0) + 1,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("usage_tracking").insert({
      user_id: userId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      integrations_connected: 1,
    });
  }
}

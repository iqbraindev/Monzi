import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function incrementIntegrationsConnected(
  workspaceId: string,
  ownerUserId: string
) {
  const supabase = getSupabaseAdmin();
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  const { data: existing } = await supabase
    .from("usage_tracking")
    .select("id, integrations_connected")
    .eq("workspace_id", workspaceId)
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
      user_id: ownerUserId,
      workspace_id: workspaceId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      integrations_connected: 1,
    });
  }
}

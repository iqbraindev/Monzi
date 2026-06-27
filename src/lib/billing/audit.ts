import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function logAuditEvent(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("audit_log").insert({
    actor_id: params.actorId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    payload: params.metadata ?? {},
  });
}

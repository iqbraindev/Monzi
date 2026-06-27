import { clerkClient } from "@clerk/nextjs/server";

import { logAuditEvent } from "@/lib/billing/audit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type { AdminUserRow } from "@/lib/admin/types";

function monthPeriodStart(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
}

export async function listAdminUsers(params?: {
  search?: string;
  role?: string;
  limit?: number;
}): Promise<AdminUserRow[]> {
  const supabase = getSupabaseAdmin();
  const periodStart = monthPeriodStart();
  const limit = params?.limit ?? 100;

  let query = supabase
    .from("users")
    .select(
      `
      id,
      email,
      full_name,
      avatar_url,
      role,
      is_active,
      is_suspended,
      suspension_reason,
      created_at,
      subscriptions (
        status,
        pack:packs ( name, slug )
      )
    `
    )
    .neq("role", "super_admin")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params?.role) {
    query = query.eq("role", params.role);
  }

  if (params?.search?.trim()) {
    const term = `%${params.search.trim()}%`;
    query = query.or(`email.ilike.${term},full_name.ilike.${term}`);
  }

  const { data: users } = await query;
  if (!users?.length) return [];

  const userIds = users.map((u) => u.id);

  const [{ data: usageRows }, { data: agentRows }] = await Promise.all([
    supabase
      .from("usage_tracking")
      .select("user_id, ai_messages_used")
      .eq("period_start", periodStart)
      .in("user_id", userIds),
    supabase.from("agents").select("user_id").in("user_id", userIds),
  ]);

  const usageByUser = new Map(
    (usageRows ?? []).map((r) => [r.user_id, r.ai_messages_used ?? 0])
  );

  const agentsByUser = new Map<string, number>();
  for (const row of agentRows ?? []) {
    agentsByUser.set(row.user_id, (agentsByUser.get(row.user_id) ?? 0) + 1);
  }

  return users.map((user) => {
    const sub = Array.isArray(user.subscriptions)
      ? user.subscriptions[0]
      : user.subscriptions;
    const pack = sub?.pack
      ? Array.isArray(sub.pack)
        ? sub.pack[0]
        : sub.pack
      : null;

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role,
      is_active: user.is_active,
      is_suspended: user.is_suspended,
      suspension_reason: user.suspension_reason,
      created_at: user.created_at,
      pack_name: pack?.name ?? null,
      pack_slug: pack?.slug ?? null,
      subscription_status: sub?.status ?? null,
      ai_messages_used: usageByUser.get(user.id) ?? 0,
      agents_count: agentsByUser.get(user.id) ?? 0,
    };
  });
}

export async function updateAdminUser(
  adminId: string,
  userId: string,
  body: {
    is_suspended?: boolean;
    suspension_reason?: string | null;
    is_active?: boolean;
    pack_id?: string;
  }
): Promise<AdminUserRow | null> {
  const supabase = getSupabaseAdmin();

  const userPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.is_suspended === "boolean") {
    userPatch.is_suspended = body.is_suspended;
    userPatch.suspension_reason = body.is_suspended
      ? (body.suspension_reason ?? "Suspended by platform admin")
      : null;
  }

  if (typeof body.is_active === "boolean") {
    userPatch.is_active = body.is_active;
  }

  if (Object.keys(userPatch).length > 1) {
    const { error } = await supabase
      .from("users")
      .update(userPatch)
      .eq("id", userId)
      .neq("role", "super_admin");

    if (error) throw new Error(error.message);
  }

  if (body.pack_id) {
    const { error } = await supabase
      .from("subscriptions")
      .update({ pack_id: body.pack_id, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
  }

  await logAuditEvent({
    actorId: adminId,
    action: "user.update",
    targetType: "user",
    targetId: userId,
    metadata: body as Record<string, unknown>,
  });

  const listed = await listAdminUsers({ limit: 500 });
  return listed.find((r) => r.id === userId) ?? null;
}

export async function syncUserClerkMetadata(
  userId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...(user.publicMetadata as Record<string, unknown>),
      ...patch,
    },
  });
}

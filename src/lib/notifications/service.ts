import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  DbNotification,
  NotificationPreferences,
  NotificationType,
} from "@/lib/notifications/types";

export async function getNotificationPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("email, push, proactive")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    email: data?.email ?? true,
    push: data?.push ?? true,
    proactive: data?.proactive ?? true,
  };
}

export async function upsertNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences(supabase, userId);
  const next = { ...current, ...prefs };

  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: userId,
    email: next.email,
    push: next.push,
    proactive: next.proactive,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return next;
}

export async function isProactiveEnabled(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const prefs = await getNotificationPreferences(supabase, userId);
  return prefs.proactive;
}

export async function createNotification(
  supabase: SupabaseClient,
  params: {
    workspaceId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }
): Promise<DbNotification> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      workspace_id: params.workspaceId,
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create notification");
  }
  return data as DbNotification;
}

export async function listNotifications(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<DbNotification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DbNotification[];
}

export async function countUnreadNotifications(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  notificationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id");

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

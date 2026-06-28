import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  DbAgentWatch,
  NotifyChannel,
  WatchCursor,
  WatchPlan,
  WatchStatus,
} from "@/lib/watches/types";

export interface CreateWatchInput {
  workspaceId: string;
  agentId: string;
  createdByUserId: string;
  plan: WatchPlan;
  status: WatchStatus;
  notifyVia?: NotifyChannel[];
  expiresAt?: string | null;
}

export async function createWatch(
  supabase: SupabaseClient,
  input: CreateWatchInput
): Promise<DbAgentWatch> {
  const { data, error } = await supabase
    .from("agent_watches")
    .insert({
      workspace_id: input.workspaceId,
      agent_id: input.agentId,
      created_by_user_id: input.createdByUserId,
      title: input.plan.title,
      condition_nl: input.plan.condition_nl,
      toolkit: input.plan.toolkit,
      poll_tool: input.plan.poll_tool,
      poll_params: input.plan.poll_params,
      cursor: input.plan.cursor,
      notify_via: input.notifyVia ?? ["in_app"],
      status: input.status,
      expires_at: input.expiresAt ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create watch");
  }
  return data as DbAgentWatch;
}

export async function listWatchesForWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  options?: { status?: WatchStatus | WatchStatus[]; agentId?: string }
): Promise<DbAgentWatch[]> {
  let query = supabase
    .from("agent_watches")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (options?.agentId) {
    query = query.eq("agent_id", options.agentId);
  }
  if (options?.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DbAgentWatch[];
}

export async function getWatchById(
  supabase: SupabaseClient,
  workspaceId: string,
  watchId: string
): Promise<DbAgentWatch | null> {
  const { data } = await supabase
    .from("agent_watches")
    .select("*")
    .eq("id", watchId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data ? (data as DbAgentWatch) : null;
}

export async function updateWatchStatus(
  supabase: SupabaseClient,
  watchId: string,
  status: WatchStatus
): Promise<void> {
  const { error } = await supabase
    .from("agent_watches")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", watchId);
  if (error) throw new Error(error.message);
}

export async function deleteWatch(
  supabase: SupabaseClient,
  workspaceId: string,
  watchId: string
): Promise<boolean> {
  const { error, count } = await supabase
    .from("agent_watches")
    .delete({ count: "exact" })
    .eq("id", watchId)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function countActiveWatches(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<number> {
  const { count } = await supabase
    .from("agent_watches")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  return count ?? 0;
}

export async function fetchWatchesDueForPoll(
  supabase: SupabaseClient,
  limit: number
): Promise<DbAgentWatch[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("agent_watches")
    .select("*")
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as DbAgentWatch[];
}

export async function markWatchChecked(
  supabase: SupabaseClient,
  watchId: string,
  updates: {
    cursor?: WatchCursor;
    lastError?: string | null;
  }
): Promise<void> {
  const payload: Record<string, unknown> = {
    last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (updates.cursor) payload.cursor = updates.cursor;
  if (updates.lastError !== undefined) payload.last_error = updates.lastError;

  const { error } = await supabase
    .from("agent_watches")
    .update(payload)
    .eq("id", watchId);
  if (error) throw new Error(error.message);
}

export async function hasTriggerEvent(
  supabase: SupabaseClient,
  watchId: string,
  sourceItemId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("watch_trigger_events")
    .select("id")
    .eq("watch_id", watchId)
    .eq("source_item_id", sourceItemId)
    .maybeSingle();
  return Boolean(data);
}

export async function recordTriggerEvent(
  supabase: SupabaseClient,
  params: {
    watchId: string;
    sourceItemId: string;
    summary: string;
    rawSnapshot?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from("watch_trigger_events").insert({
    watch_id: params.watchId,
    source_item_id: params.sourceItemId,
    summary: params.summary,
    raw_snapshot: params.rawSnapshot ?? null,
  });
  if (error && !error.message.includes("duplicate")) {
    throw new Error(error.message);
  }
}

export async function resumeWatchesNeedingConnection(
  supabase: SupabaseClient,
  workspaceId: string,
  toolkit: string
): Promise<number> {
  const { data, error } = await supabase
    .from("agent_watches")
    .update({
      status: "active",
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("toolkit", toolkit.toLowerCase())
    .eq("status", "needs_connection")
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

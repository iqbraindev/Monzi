import type { SupabaseClient } from "@supabase/supabase-js";

import type { ComposioScopeOptions } from "@/lib/composio/scope";
import { listActiveConnections } from "@/lib/composio/tools";

import type {
  DashboardWithWidgets,
  DbDashboard,
  DbWidget,
  WidgetType,
} from "@/lib/dashboard/types";
import {
  defaultDataSource,
  getRegistryEntry,
  getRequiredToolkit,
  layoutForSize,
} from "@/lib/dashboard/widget-registry";

export interface DashboardSummary {
  id: string;
  name: string;
  widgetCount: number;
}

export async function listDashboards(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<DashboardWithWidgets[]> {
  const { data: dashboards } = await supabase
    .from("dashboards")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!dashboards?.length) return [];

  const ids = dashboards.map((d) => d.id);
  const { data: widgets } = await supabase
    .from("widgets")
    .select("*")
    .in("dashboard_id", ids)
    .order("created_at", { ascending: true });

  const byDashboard = new Map<string, DbWidget[]>();
  for (const w of widgets ?? []) {
    const list = byDashboard.get(w.dashboard_id) ?? [];
    list.push(w as DbWidget);
    byDashboard.set(w.dashboard_id, list);
  }

  return dashboards.map((d) => ({
    ...(d as DbDashboard),
    widgets: byDashboard.get(d.id) ?? [],
  }));
}

export async function listDashboardSummaries(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<DashboardSummary[]> {
  const dashboards = await listDashboards(supabase, workspaceId);
  return dashboards.map((d) => ({
    id: d.id,
    name: d.name,
    widgetCount: d.widgets.length,
  }));
}

export async function resolveDashboard(
  supabase: SupabaseClient,
  workspaceId: string,
  params: { dashboardId?: string; dashboardName?: string }
): Promise<DbDashboard | null> {
  if (params.dashboardId) {
    const { data } = await supabase
      .from("dashboards")
      .select("*")
      .eq("id", params.dashboardId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    return data ? (data as DbDashboard) : null;
  }

  if (params.dashboardName) {
    const normalized = params.dashboardName.trim().toLowerCase();
    const dashboards = await listDashboards(supabase, workspaceId);
    const matches = dashboards.filter(
      (d) => d.name.trim().toLowerCase() === normalized
    );
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      throw new Error(
        `Multiple dashboards match "${params.dashboardName}". Ask the user to clarify.`
      );
    }
    return null;
  }

  return null;
}

export async function assertWidgetConnection(
  workspaceId: string,
  type: string,
  composioScope?: ComposioScopeOptions
): Promise<{ ok: true } | { ok: false; message: string }> {
  const toolkit = getRequiredToolkit(type);
  if (!toolkit) return { ok: true };

  const connections = await listActiveConnections(workspaceId, composioScope);
  const connected = connections.some(
    (c) => c.toolkit?.slug?.toLowerCase() === toolkit.toLowerCase()
  );

  if (connected) return { ok: true };

  const reg = getRegistryEntry(type);
  const appName = reg?.label ?? toolkit;
  return {
    ok: false,
    message: `${appName} requires connecting ${toolkit} in Integrations before adding this widget.`,
  };
}

export async function createDashboard(
  supabase: SupabaseClient,
  params: {
    userId: string;
    workspaceId: string;
    name: string;
    description?: string;
    icon?: string;
    createdBy?: "user" | "agent";
  }
): Promise<DbDashboard> {
  const { data, error } = await supabase
    .from("dashboards")
    .insert({
      user_id: params.userId,
      workspace_id: params.workspaceId,
      name: params.name,
      description: params.description ?? null,
      icon: params.icon ?? "📊",
      created_by: params.createdBy ?? "user",
      is_default: false,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create dashboard");
  return data as DbDashboard;
}

export async function updateDashboard(
  supabase: SupabaseClient,
  params: {
    workspaceId: string;
    dashboardId: string;
    name?: string;
    icon?: string;
    description?: string;
  }
): Promise<DbDashboard> {
  const updates: Record<string, string | null> = {};
  if (params.name !== undefined) updates.name = params.name;
  if (params.icon !== undefined) updates.icon = params.icon;
  if (params.description !== undefined) updates.description = params.description;

  if (Object.keys(updates).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await supabase
    .from("dashboards")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", params.dashboardId)
    .eq("workspace_id", params.workspaceId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update dashboard");
  return data as DbDashboard;
}

export async function deleteDashboard(
  supabase: SupabaseClient,
  workspaceId: string,
  dashboardId: string
): Promise<void> {
  const { error } = await supabase
    .from("dashboards")
    .delete()
    .eq("id", dashboardId)
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);
}

export async function deleteWidget(
  supabase: SupabaseClient,
  workspaceId: string,
  dashboardId: string,
  widgetId: string
): Promise<void> {
  const { data: dashboard } = await supabase
    .from("dashboards")
    .select("id")
    .eq("id", dashboardId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!dashboard) throw new Error("Dashboard not found");

  const { error } = await supabase
    .from("widgets")
    .delete()
    .eq("id", widgetId)
    .eq("dashboard_id", dashboardId);

  if (error) throw new Error(error.message);
}

export async function createWidget(
  supabase: SupabaseClient,
  params: {
    workspaceId: string;
    dashboardId: string;
    type: string;
    title: string;
    dataSource?: Partial<import("@/lib/dashboard/types").WidgetDataSource>;
    layout?: import("@/lib/dashboard/types").WidgetLayout;
    size?: "small" | "medium" | "large";
    createdBy?: "user" | "agent";
    skipConnectionCheck?: boolean;
    composioScope?: ComposioScopeOptions;
  }
): Promise<DbWidget> {
  if (!params.skipConnectionCheck) {
    const check = await assertWidgetConnection(
      params.workspaceId,
      params.type,
      params.composioScope
    );
    if (!check.ok) throw new Error(check.message);
  }

  const reg = getRegistryEntry(params.type);
  const dataSource = {
    ...defaultDataSource((params.type as WidgetType) || "insights"),
    ...params.dataSource,
  };

  const { data, error } = await supabase
    .from("widgets")
    .insert({
      dashboard_id: params.dashboardId,
      type: params.type,
      title: params.title,
      data_source: dataSource,
      layout: params.layout ?? layoutForSize(params.size ?? "medium"),
      created_by: params.createdBy ?? "user",
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create widget");
  return data as DbWidget;
}

export async function logAgentAction(
  supabase: SupabaseClient,
  params: {
    agentId: string;
    userId: string;
    workspaceId: string;
    actionType: string;
    payload?: Record<string, unknown>;
    conversationId?: string;
  }
): Promise<void> {
  await supabase.from("agent_dashboard_actions").insert({
    agent_id: params.agentId,
    user_id: params.userId,
    workspace_id: params.workspaceId,
    action_type: params.actionType,
    payload: params.payload ?? null,
    conversation_id: params.conversationId ?? null,
  });
}

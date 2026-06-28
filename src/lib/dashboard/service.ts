import type { SupabaseClient } from "@supabase/supabase-js";

import type { ComposioScopeOptions } from "@/lib/composio/scope";
import { listActiveConnections } from "@/lib/composio/tools";
import { canCreateDashboard, canCreateWidget } from "@/lib/billing/limit-enforcer";
import { broadcastDashboardCreated } from "@/lib/dashboard/broadcast";

import type {
  DashboardWithWidgets,
  DbDashboard,
  DbWidget,
  WidgetLayout,
  WidgetType,
} from "@/lib/dashboard/types";
import {
  defaultDataSource,
  getRegistryEntry,
  getRequiredToolkit,
  layoutForSize,
} from "@/lib/dashboard/widget-registry";
import { nextLayoutRow } from "@/lib/dashboard/layout-utils";

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

export interface ConnectionHint {
  widgetType: string;
  widgetTitle: string;
  toolkit: string;
}

export interface CreateDashboardWithWidgetsResult {
  dashboard: DbDashboard;
  widgets: DbWidget[];
  connectionHints: ConnectionHint[];
  skippedWidgets: string[];
}

export async function getConnectionHintsForWidgetTypes(
  workspaceId: string,
  widgetTypes: string[],
  composioScope?: ComposioScopeOptions
): Promise<ConnectionHint[]> {
  const connections = await listActiveConnections(workspaceId, composioScope);
  const connectedSlugs = new Set(
    connections
      .map((c) => c.toolkit?.slug?.toLowerCase())
      .filter((slug): slug is string => Boolean(slug))
  );

  const hints: ConnectionHint[] = [];
  for (const type of widgetTypes) {
    const toolkit = getRequiredToolkit(type);
    if (!toolkit || connectedSlugs.has(toolkit.toLowerCase())) continue;
    const reg = getRegistryEntry(type);
    hints.push({
      widgetType: type,
      widgetTitle: reg?.defaultTitle ?? type,
      toolkit,
    });
  }
  return hints;
}

export async function createDashboardWithWidgets(
  supabase: SupabaseClient,
  params: {
    userId: string;
    workspaceId: string;
    ownerUserId: string;
    name: string;
    description?: string;
    icon?: string;
    createdBy?: "user" | "agent";
    widgets: Array<{
      type: string;
      title?: string;
      layout?: WidgetLayout;
      size?: "small" | "medium" | "large";
    }>;
    composioScope?: ComposioScopeOptions;
    autoSwitch?: boolean;
  }
): Promise<CreateDashboardWithWidgetsResult> {
  const dashboardCheck = await canCreateDashboard(
    params.workspaceId,
    params.ownerUserId
  );
  if (!dashboardCheck.ok) {
    throw new Error(dashboardCheck.error.error);
  }

  const dashboard = await createDashboard(supabase, {
    userId: params.userId,
    workspaceId: params.workspaceId,
    name: params.name,
    description: params.description,
    icon: params.icon,
    createdBy: params.createdBy,
  });

  const createdWidgets: DbWidget[] = [];
  const skippedWidgets: string[] = [];

  for (const widgetSpec of params.widgets) {
    const widgetCheck = await canCreateWidget(
      params.workspaceId,
      params.ownerUserId,
      dashboard.id
    );
    if (!widgetCheck.ok) {
      skippedWidgets.push(widgetSpec.type);
      continue;
    }

    const reg = getRegistryEntry(widgetSpec.type);
    if (!reg) {
      skippedWidgets.push(widgetSpec.type);
      continue;
    }

    const widget = await createWidget(supabase, {
      workspaceId: params.workspaceId,
      dashboardId: dashboard.id,
      type: widgetSpec.type,
      title: widgetSpec.title ?? reg.defaultTitle,
      layout: widgetSpec.layout,
      size: widgetSpec.size,
      composioScope: params.composioScope,
      skipConnectionCheck: true,
      createdBy: params.createdBy ?? "user",
    });
    createdWidgets.push(widget);
  }

  const connectionHints = await getConnectionHintsForWidgetTypes(
    params.workspaceId,
    createdWidgets.map((w) => w.type),
    params.composioScope
  );

  await broadcastDashboardCreated(
    params.workspaceId,
    dashboard,
    createdWidgets,
    params.autoSwitch ?? true
  );

  return {
    dashboard,
    widgets: createdWidgets,
    connectionHints,
    skippedWidgets,
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

export async function updateWidgetLayouts(
  supabase: SupabaseClient,
  workspaceId: string,
  dashboardId: string,
  layouts: Array<{ id: string; x: number; y: number; w: number; h: number }>
): Promise<void> {
  const { data: dashboard } = await supabase
    .from("dashboards")
    .select("id")
    .eq("id", dashboardId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!dashboard) throw new Error("Dashboard not found");

  const updatedAt = new Date().toISOString();

  const results = await Promise.all(
    layouts.map(({ id, x, y, w, h }) =>
      supabase
        .from("widgets")
        .update({
          layout: { x, y, w, h },
          updated_at: updatedAt,
        })
        .eq("id", id)
        .eq("dashboard_id", dashboardId)
        .select("id")
    )
  );

  for (const [index, { data, error }] of results.entries()) {
    if (error) {
      throw new Error(error.message);
    }
    if (!data?.length) {
      throw new Error(`Widget not found: ${layouts[index]?.id ?? "unknown"}`);
    }
  }
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

  let resolvedLayout = params.layout;
  if (!resolvedLayout) {
    const { data: existingWidgets } = await supabase
      .from("widgets")
      .select("layout")
      .eq("dashboard_id", params.dashboardId);

    const nextY = nextLayoutRow(
      (existingWidgets ?? []) as Array<{ layout?: WidgetLayout | null }>
    );
    resolvedLayout = layoutForSize(params.size ?? "medium", nextY);
  }

  const { data, error } = await supabase
    .from("widgets")
    .insert({
      dashboard_id: params.dashboardId,
      type: params.type,
      title: params.title,
      data_source: dataSource,
      layout: resolvedLayout,
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

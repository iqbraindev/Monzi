import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  DashboardWithWidgets,
  DbDashboard,
  DbWidget,
} from "@/lib/dashboard/types";
import {
  DEFAULT_SEED_WIDGETS,
  defaultDataSource,
  getRegistryEntry,
  layoutForSize,
} from "@/lib/dashboard/widget-registry";

export async function listDashboards(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardWithWidgets[]> {
  const { data: dashboards } = await supabase
    .from("dashboards")
    .select("*")
    .eq("user_id", userId)
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

export async function getDefaultDashboard(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardWithWidgets | null> {
  const dashboards = await listDashboards(supabase, userId);
  return dashboards.find((d) => d.is_default) ?? dashboards[0] ?? null;
}

export async function seedDefaultDashboardIfEmpty(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const dashboards = await listDashboards(supabase, userId);
  let dashboard = dashboards.find((d) => d.is_default) ?? dashboards[0];

  if (!dashboard) {
    const { data: created } = await supabase
      .from("dashboards")
      .insert({
        user_id: userId,
        name: "Morning Briefing",
        icon: "🌅",
        is_default: true,
        created_by: "user",
      })
      .select("*")
      .single();
    if (!created) return;
    dashboard = { ...(created as DbDashboard), widgets: [] };
  }

  if (dashboard.widgets.length > 0) return;

  await Promise.all(
    DEFAULT_SEED_WIDGETS.map((seed) =>
      supabase.from("widgets").insert({
        dashboard_id: dashboard!.id,
        type: seed.type,
        title: seed.title,
        data_source: defaultDataSource(seed.type),
        layout: seed.layout,
        created_by: "user",
      })
    )
  );
}

export async function createDashboard(
  supabase: SupabaseClient,
  params: {
    userId: string;
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

export async function createWidget(
  supabase: SupabaseClient,
  params: {
    dashboardId: string;
    type: string;
    title: string;
    dataSource?: Partial<import("@/lib/dashboard/types").WidgetDataSource>;
    layout?: import("@/lib/dashboard/types").WidgetLayout;
    size?: "small" | "medium" | "large";
    createdBy?: "user" | "agent";
  }
): Promise<DbWidget> {
  const reg = getRegistryEntry(params.type);
  const dataSource = {
    ...defaultDataSource((params.type as import("@/lib/dashboard/types").WidgetType) || "insights"),
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
    actionType: string;
    payload?: Record<string, unknown>;
    conversationId?: string;
  }
): Promise<void> {
  await supabase.from("agent_dashboard_actions").insert({
    agent_id: params.agentId,
    user_id: params.userId,
    action_type: params.actionType,
    payload: params.payload ?? null,
    conversation_id: params.conversationId ?? null,
  });
}

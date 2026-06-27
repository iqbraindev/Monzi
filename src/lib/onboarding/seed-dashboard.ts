import type { SupabaseClient } from "@supabase/supabase-js";

import { canCreateWidget } from "@/lib/billing/limit-enforcer";
import { broadcastWidgetCreated } from "@/lib/dashboard/broadcast";
import { createWidget } from "@/lib/dashboard/service";
import type { DbWidget } from "@/lib/dashboard/types";
import {
  layoutForSize,
  WIDGET_REGISTRY,
  WIDGET_TOOLKIT,
} from "@/lib/dashboard/widget-registry";
import type { ComposioScopeOptions } from "@/lib/composio/scope";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureDefaultDashboard } from "@/lib/workspaces/service";

const TOOLKIT_TO_WIDGET: Record<string, keyof typeof WIDGET_TOOLKIT> = {};
for (const [widgetType, toolkit] of Object.entries(WIDGET_TOOLKIT)) {
  if (toolkit) TOOLKIT_TO_WIDGET[toolkit] = widgetType as keyof typeof WIDGET_TOOLKIT;
}

export interface SeedDashboardResult {
  dashboardId: string;
  dashboardName: string;
  widgets: DbWidget[];
}

export async function seedDashboardFromToolkits(params: {
  workspaceId: string;
  userId: string;
  ownerUserId: string;
  connectedToolkits: string[];
  composioScope?: ComposioScopeOptions;
  supabase?: SupabaseClient;
}): Promise<SeedDashboardResult> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const dashboard = await ensureDefaultDashboard(
    params.workspaceId,
    params.userId
  );

  const { data: existingWidgets } = await supabase
    .from("widgets")
    .select("type")
    .eq("dashboard_id", dashboard.id);

  const existingTypes = new Set((existingWidgets ?? []).map((w) => w.type));
  const created: DbWidget[] = [];
  let layoutY = 0;

  const normalizedToolkits = [
    ...new Set(params.connectedToolkits.map((t) => t.toLowerCase())),
  ];

  for (const toolkit of normalizedToolkits) {
    const widgetType = TOOLKIT_TO_WIDGET[toolkit];
    if (!widgetType || existingTypes.has(widgetType)) continue;

    const reg = WIDGET_REGISTRY[widgetType as keyof typeof WIDGET_REGISTRY];
    if (!reg) continue;

    const widgetCheck = await canCreateWidget(
      params.workspaceId,
      params.ownerUserId,
      dashboard.id
    );
    if (!widgetCheck.ok) break;

    const widget = await createWidget(supabase, {
      workspaceId: params.workspaceId,
      dashboardId: dashboard.id,
      type: widgetType,
      title: reg.defaultTitle,
      layout: layoutForSize("medium", layoutY),
      createdBy: "user",
      composioScope: params.composioScope,
    });

    layoutY += 4;
    existingTypes.add(widgetType);
    created.push(widget);
    await broadcastWidgetCreated(params.workspaceId, dashboard.id, widget);
  }

  if (created.length === 0 && !existingTypes.has("insights")) {
    const widgetCheck = await canCreateWidget(
      params.workspaceId,
      params.ownerUserId,
      dashboard.id
    );
    if (widgetCheck.ok) {
      const widget = await createWidget(supabase, {
        workspaceId: params.workspaceId,
        dashboardId: dashboard.id,
        type: "insights",
        title: WIDGET_REGISTRY.insights.defaultTitle,
        layout: layoutForSize("medium", 0),
        createdBy: "user",
        skipConnectionCheck: true,
        composioScope: params.composioScope,
      });
      created.push(widget);
      await broadcastWidgetCreated(params.workspaceId, dashboard.id, widget);
    }
  }

  return {
    dashboardId: dashboard.id,
    dashboardName: dashboard.name,
    widgets: created,
  };
}

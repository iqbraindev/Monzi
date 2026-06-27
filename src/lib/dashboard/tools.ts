import { tool } from "ai";
import { z } from "zod";

import {
  broadcastDashboardCreated,
  broadcastWidgetCreated,
} from "@/lib/dashboard/broadcast";
import {
  assertWidgetConnection,
  createDashboard,
  createWidget,
  listDashboardSummaries,
  logAgentAction,
  resolveDashboard,
} from "@/lib/dashboard/service";
import { defaultDataSource, WIDGET_TYPES } from "@/lib/dashboard/widget-registry";
import type { ComposioScopeOptions } from "@/lib/composio/scope";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface DashboardToolsContext {
  userId: string;
  workspaceId: string;
  composioScope: ComposioScopeOptions;
  agentId: string;
  conversationId?: string;
}

export function getDashboardTools(ctx: DashboardToolsContext) {
  const supabase = getSupabaseAdmin();

  return {
    list_dashboards: tool({
      description:
        "List the user's dashboards (id and name). Use before adding widgets when you need to confirm which dashboard exists.",
      inputSchema: z.object({}),
      execute: async () => {
        const summaries = await listDashboardSummaries(supabase, ctx.workspaceId);
        if (summaries.length === 0) {
          return "The user has no dashboards yet. Ask them for a name and use create_dashboard to create one.";
        }
        return JSON.stringify(summaries);
      },
    }),

    create_dashboard_widget: tool({
      description:
        "Add a widget to a specific user dashboard. You must know which dashboard to use — ask the user if they have not specified one.",
      inputSchema: z.object({
        type: z.enum(WIDGET_TYPES as [string, ...string[]]),
        title: z.string().describe("Widget title shown to the user"),
        dashboard_id: z
          .string()
          .optional()
          .describe("Target dashboard ID when known"),
        dashboard_name: z
          .string()
          .optional()
          .describe("Target dashboard name when the user names it"),
        integration: z.string().optional(),
        composio_tool: z.string().optional(),
        filters: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Optional data filters, e.g. { max_results: 3 } for email"),
        size: z.enum(["small", "medium", "large"]).default("medium"),
      }),
      execute: async (params) => {
        if (!params.dashboard_id && !params.dashboard_name) {
          return "Which dashboard should I add this to? List the user's dashboards or ask them to name one — I can create a new dashboard if they provide a name.";
        }

        const connectionCheck = await assertWidgetConnection(
          ctx.workspaceId,
          params.type,
          ctx.composioScope
        );
        if (!connectionCheck.ok) {
          return connectionCheck.message;
        }

        let dashboard: Awaited<ReturnType<typeof resolveDashboard>> = null;
        try {
          dashboard = await resolveDashboard(supabase, ctx.workspaceId, {
            dashboardId: params.dashboard_id,
            dashboardName: params.dashboard_name,
          });
        } catch (err) {
          return err instanceof Error ? err.message : "Could not resolve dashboard.";
        }

        if (!dashboard) {
          const name = params.dashboard_name ?? params.dashboard_id ?? "that dashboard";
          return `No dashboard named "${name}" found. Ask the user for a dashboard name or use create_dashboard to create one.`;
        }

        const baseSource = defaultDataSource(
          params.type as import("@/lib/dashboard/types").WidgetType
        );
        const widget = await createWidget(supabase, {
          workspaceId: ctx.workspaceId,
          dashboardId: dashboard.id,
          type: params.type,
          title: params.title,
          size: params.size,
          composioScope: ctx.composioScope,
          dataSource: {
            integration: params.integration ?? baseSource.integration,
            composio_tool: params.composio_tool ?? baseSource.composio_tool,
            filters: { ...baseSource.filters, ...params.filters },
            refresh_interval_sec: baseSource.refresh_interval_sec,
          },
          createdBy: "agent",
        });

        try {
          await logAgentAction(supabase, {
            agentId: ctx.agentId,
            userId: ctx.userId,
            workspaceId: ctx.workspaceId,
            actionType: "create_widget",
            conversationId: ctx.conversationId,
            payload: {
              widgetId: widget.id,
              dashboardId: dashboard.id,
              dashboardName: dashboard.name,
              title: params.title,
            },
          });
        } catch (err) {
          console.warn("[create_dashboard_widget] logAgentAction failed", err);
        }

        await broadcastWidgetCreated(ctx.workspaceId, dashboard.id, widget);

        return `Widget "${params.title}" has been added to the "${dashboard.name}" dashboard.`;
      },
    }),

    create_dashboard: tool({
      description:
        "Create a new dashboard with the name the user provides. Optionally add initial widgets.",
      inputSchema: z.object({
        name: z.string(),
        description: z.string().optional(),
        icon: z.string().optional().describe("Optional emoji icon for the tab"),
        widgets: z
          .array(
            z.object({
              type: z.enum(WIDGET_TYPES as [string, ...string[]]),
              title: z.string(),
              size: z.enum(["small", "medium", "large"]).default("medium"),
            })
          )
          .default([]),
      }),
      execute: async (params) => {
        const dashboard = await createDashboard(supabase, {
          userId: ctx.userId,
          workspaceId: ctx.workspaceId,
          name: params.name,
          description: params.description,
          icon: params.icon ?? "📊",
          createdBy: "agent",
        });

        const widgets: Awaited<ReturnType<typeof createWidget>>[] = [];
        for (let i = 0; i < params.widgets.length; i++) {
          const w = params.widgets[i];
          const connectionCheck = await assertWidgetConnection(
            ctx.workspaceId,
            w.type,
            ctx.composioScope
          );
          if (!connectionCheck.ok) {
            throw new Error(connectionCheck.message);
          }
          widgets.push(
            await createWidget(supabase, {
              workspaceId: ctx.workspaceId,
              dashboardId: dashboard.id,
              type: w.type,
              title: w.title,
              size: w.size,
              composioScope: ctx.composioScope,
              layout: {
                x: (i % 2) * 6,
                y: Math.floor(i / 2) * 4,
                w: w.size === "large" ? 12 : w.size === "small" ? 4 : 6,
                h: w.size === "small" ? 3 : 4,
              },
              createdBy: "agent",
            })
          );
        }

        await logAgentAction(supabase, {
          agentId: ctx.agentId,
          userId: ctx.userId,
          workspaceId: ctx.workspaceId,
          actionType: "create_dashboard",
          conversationId: ctx.conversationId,
          payload: { dashboardId: dashboard.id, name: params.name },
        });

        await broadcastDashboardCreated(ctx.workspaceId, dashboard, widgets, true);

        return `I've created the "${params.name}" dashboard with ${widgets.length} widget(s) and switched you to it.`;
      },
    }),
  };
}

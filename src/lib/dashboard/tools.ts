import { tool } from "ai";
import { z } from "zod";

import {
  broadcastDashboardCreated,
  broadcastWidgetCreated,
} from "@/lib/dashboard/broadcast";
import {
  createDashboard,
  createWidget,
  getDefaultDashboard,
  logAgentAction,
  seedDefaultDashboardIfEmpty,
} from "@/lib/dashboard/service";
import { defaultDataSource, WIDGET_TYPES } from "@/lib/dashboard/widget-registry";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface DashboardToolsContext {
  userId: string;
  agentId: string;
  conversationId?: string;
}

export function getDashboardTools(ctx: DashboardToolsContext) {
  const supabase = getSupabaseAdmin();

  return {
    create_dashboard_widget: tool({
      description:
        "Create a new widget on the user's dashboard to display data visually. Use when the user asks to show, display, or pull up information.",
      inputSchema: z.object({
        type: z.enum(WIDGET_TYPES as [string, ...string[]]),
        title: z.string().describe("Widget title shown to the user"),
        dashboard_id: z
          .string()
          .optional()
          .describe("Target dashboard ID; uses default if omitted"),
        integration: z.string().optional(),
        composio_tool: z.string().optional(),
        filters: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Optional data filters, e.g. { max_results: 3 } for email"),
        size: z.enum(["small", "medium", "large"]).default("medium"),
      }),
      execute: async (params) => {
        await seedDefaultDashboardIfEmpty(supabase, ctx.userId);

        let dashboardId = params.dashboard_id;
        if (!dashboardId) {
          const def = await getDefaultDashboard(supabase, ctx.userId);
          if (!def) throw new Error("No dashboard found for user");
          dashboardId = def.id;
        }

        const baseSource = defaultDataSource(params.type as import("@/lib/dashboard/types").WidgetType);
        const widget = await createWidget(supabase, {
          dashboardId,
          type: params.type,
          title: params.title,
          size: params.size,
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
            actionType: "create_widget",
            conversationId: ctx.conversationId,
            payload: { widgetId: widget.id, dashboardId, title: params.title },
          });
        } catch (err) {
          console.warn("[create_dashboard_widget] logAgentAction failed", err);
        }

        await broadcastWidgetCreated(ctx.userId, dashboardId, widget);

        return `Widget "${params.title}" has been added to your dashboard.`;
      },
    }),

    create_dashboard: tool({
      description:
        "Create a complete custom dashboard with multiple widgets. Use when the user asks to build a view for a specific purpose.",
      inputSchema: z.object({
        name: z.string(),
        description: z.string().optional(),
        widgets: z.array(
          z.object({
            type: z.enum(WIDGET_TYPES as [string, ...string[]]),
            title: z.string(),
            size: z.enum(["small", "medium", "large"]).default("medium"),
          })
        ),
      }),
      execute: async (params) => {
        const dashboard = await createDashboard(supabase, {
          userId: ctx.userId,
          name: params.name,
          description: params.description,
          icon: "✨",
          createdBy: "agent",
        });

        const widgets = await Promise.all(
          params.widgets.map((w, i) =>
            createWidget(supabase, {
              dashboardId: dashboard.id,
              type: w.type,
              title: w.title,
              size: w.size,
              layout: {
                x: (i % 2) * 6,
                y: Math.floor(i / 2) * 4,
                w: w.size === "large" ? 12 : w.size === "small" ? 4 : 6,
                h: w.size === "small" ? 3 : 4,
              },
              createdBy: "agent",
            })
          )
        );

        await logAgentAction(supabase, {
          agentId: ctx.agentId,
          userId: ctx.userId,
          actionType: "create_dashboard",
          conversationId: ctx.conversationId,
          payload: { dashboardId: dashboard.id, name: params.name },
        });

        await broadcastDashboardCreated(ctx.userId, dashboard, widgets, true);

        return `I've created the "${params.name}" dashboard with ${widgets.length} widget(s) and switched you to it.`;
      },
    }),
  };
}

import type { DashboardWidgetId } from "@/lib/aria/types";

export interface WidgetToolConfig {
  tool: string;
  toolkit: string;
  defaultParams?: Record<string, unknown>;
  cacheTtlSec: number;
}

export const WIDGET_TOOL_MAP: Partial<Record<DashboardWidgetId, WidgetToolConfig>> = {
  email: {
    tool: "GMAIL_FETCH_EMAILS",
    toolkit: "gmail",
    defaultParams: { max_results: 10 },
    cacheTtlSec: 120,
  },
  tasks: {
    tool: "NOTION_FETCH_NOTION_CHILD_BLOCK",
    toolkit: "notion",
    defaultParams: { page_size: 15 },
    cacheTtlSec: 180,
  },
  calendar: {
    tool: "GOOGLECALENDAR_EVENTS_LIST",
    toolkit: "googlecalendar",
    defaultParams: {
      calendar_id: "primary",
      max_results: 10,
      single_events: true,
      order_by: "startTime",
    },
    cacheTtlSec: 120,
  },
  revenue: {
    tool: "STRIPE_LIST_BALANCE_TRANSACTIONS",
    toolkit: "stripe",
    defaultParams: { limit: 30 },
    cacheTtlSec: 300,
  },
  pipeline: {
    tool: "HUBSPOT_LIST_DEALS",
    toolkit: "hubspot",
    defaultParams: { limit: 20 },
    cacheTtlSec: 300,
  },
};

export function getWidgetToolConfig(
  widgetId: DashboardWidgetId
): WidgetToolConfig | undefined {
  return WIDGET_TOOL_MAP[widgetId];
}

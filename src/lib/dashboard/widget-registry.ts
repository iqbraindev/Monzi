import type { WidgetType, WidgetLayout, WidgetDataSource } from "@/lib/dashboard/types";
import { getWidgetToolConfig } from "@/lib/composio/tool-map";
import type { DashboardWidgetId } from "@/lib/aria/types";

export interface WidgetRegistryEntry {
  type: WidgetType;
  label: string;
  defaultTitle: string;
  integration: string;
  composioTool: string;
  defaultLayout: WidgetLayout;
  defaultFilters?: Record<string, unknown>;
}

const SIZE_MAP = {
  small: { w: 3, h: 3 },
  medium: { w: 6, h: 4 },
  large: { w: 9, h: 5 },
} as const;

export function layoutForSize(
  size: keyof typeof SIZE_MAP,
  y = 999
): WidgetLayout {
  return { x: 0, y, ...SIZE_MAP[size] };
}

function entry(
  type: WidgetType,
  label: string,
  widgetId: DashboardWidgetId
): WidgetRegistryEntry {
  const tool = getWidgetToolConfig(widgetId);
  return {
    type,
    label,
    defaultTitle: label,
    integration: tool?.toolkit ?? type,
    composioTool: tool?.tool ?? "",
    defaultLayout: layoutForSize("medium"),
    defaultFilters: tool?.defaultParams,
  };
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetRegistryEntry> = {
  email: entry("email", "Email Inbox", "email"),
  tasks: entry("tasks", "Tasks", "tasks"),
  calendar: entry("calendar", "Calendar", "calendar"),
  revenue: entry("revenue", "Revenue", "revenue"),
  pipeline: entry("pipeline", "Pipeline", "pipeline"),
  insights: {
    type: "insights",
    label: "AI Insights",
    defaultTitle: "AI Insights",
    integration: "monzi",
    composioTool: "",
    defaultLayout: layoutForSize("medium"),
  },
};

export const WIDGET_TYPES = Object.keys(WIDGET_REGISTRY) as WidgetType[];

export function getRegistryEntry(type: string): WidgetRegistryEntry | undefined {
  return WIDGET_REGISTRY[type as WidgetType];
}

export function defaultDataSource(type: WidgetType): WidgetDataSource {
  const reg = WIDGET_REGISTRY[type];
  return {
    integration: reg.integration,
    composio_tool: reg.composioTool,
    filters: reg.defaultFilters ?? {},
    refresh_interval_sec: 120,
  };
}

/** Default widgets to seed an empty dashboard (Morning Briefing layout). */
export const DEFAULT_SEED_WIDGETS: { type: WidgetType; title: string; layout: WidgetLayout }[] = [
  { type: "email", title: "Email Inbox", layout: { x: 0, y: 0, w: 6, h: 4 } },
  { type: "tasks", title: "Tasks", layout: { x: 6, y: 0, w: 6, h: 4 } },
  { type: "calendar", title: "Calendar", layout: { x: 0, y: 4, w: 4, h: 4 } },
  { type: "revenue", title: "Revenue", layout: { x: 4, y: 4, w: 4, h: 4 } },
  { type: "pipeline", title: "Pipeline", layout: { x: 8, y: 4, w: 4, h: 4 } },
  { type: "insights", title: "AI Insights", layout: { x: 0, y: 8, w: 12, h: 3 } },
];

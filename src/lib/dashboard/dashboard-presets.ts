import type { WidgetLayout, WidgetType } from "@/lib/dashboard/types";

export interface DashboardPresetWidget {
  type: WidgetType;
  title?: string;
  layout: WidgetLayout;
}

export interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  widgets: DashboardPresetWidget[];
}

export const DASHBOARD_PRESETS: DashboardPreset[] = [
  {
    id: "sales",
    name: "Sales command center",
    description: "Pipeline, revenue, and inbox in one view.",
    icon: "💰",
    widgets: [
      { type: "pipeline", layout: { x: 0, y: 0, w: 6, h: 4 } },
      { type: "revenue", layout: { x: 6, y: 0, w: 6, h: 4 } },
      { type: "email", layout: { x: 0, y: 4, w: 12, h: 4 } },
    ],
  },
  {
    id: "productivity",
    name: "Productivity",
    description: "Tasks, calendar, and email for your daily workflow.",
    icon: "📅",
    widgets: [
      { type: "tasks", layout: { x: 0, y: 0, w: 6, h: 4 } },
      { type: "calendar", layout: { x: 6, y: 0, w: 6, h: 4 } },
      { type: "email", layout: { x: 0, y: 4, w: 12, h: 4 } },
    ],
  },
  {
    id: "executive",
    name: "Executive overview",
    description: "Revenue, pipeline, and AI insights at a glance.",
    icon: "🎯",
    widgets: [
      { type: "revenue", layout: { x: 0, y: 0, w: 6, h: 4 } },
      { type: "pipeline", layout: { x: 6, y: 0, w: 6, h: 4 } },
      { type: "insights", layout: { x: 0, y: 4, w: 12, h: 4 } },
    ],
  },
  {
    id: "blank",
    name: "Blank dashboard",
    description: "Start empty and add widgets yourself.",
    icon: "📊",
    widgets: [],
  },
];

export function getDashboardPreset(id: string): DashboardPreset | undefined {
  return DASHBOARD_PRESETS.find((preset) => preset.id === id);
}

export function resolvePresetWidgets(
  preset: DashboardPreset,
  widgetTypes?: string[]
): DashboardPresetWidget[] {
  if (!widgetTypes) return preset.widgets;
  const allowed = new Set(widgetTypes);
  return preset.widgets.filter((widget) => allowed.has(widget.type));
}

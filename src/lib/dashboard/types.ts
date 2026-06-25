export type WidgetType =
  | "email"
  | "tasks"
  | "calendar"
  | "revenue"
  | "pipeline"
  | "insights";

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetDataSource {
  integration: string;
  composio_tool: string;
  filters?: Record<string, unknown>;
  refresh_interval_sec?: number;
}

export interface DbDashboard {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_default: boolean;
  is_pinned: boolean;
  created_by: "user" | "agent";
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbWidget {
  id: string;
  dashboard_id: string;
  type: string;
  title: string;
  data_source: WidgetDataSource;
  layout: WidgetLayout;
  style?: Record<string, unknown>;
  is_highlighted: boolean;
  created_by: "user" | "agent";
  created_at: string;
  updated_at: string;
}

export interface DashboardWithWidgets extends DbDashboard {
  widgets: DbWidget[];
}

export type DashboardRealtimeEvent =
  | { event: "widget:created"; payload: { widget: DbWidget; dashboardId: string } }
  | {
      event: "dashboard:created";
      payload: { dashboard: DbDashboard; widgets: DbWidget[]; autoSwitch?: boolean };
    };

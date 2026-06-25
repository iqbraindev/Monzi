import { create } from "zustand";

import type { DashboardWithWidgets, DbDashboard, DbWidget } from "@/lib/dashboard/types";

interface DashboardState {
  activeDashboardId: string | null;
  dashboards: DashboardWithWidgets[];
  pickerOpen: boolean;
  insightDismissed: boolean;
  hydrated: boolean;
  setDashboards: (dashboards: DashboardWithWidgets[]) => void;
  setActiveDashboard: (id: string) => void;
  addWidget: (dashboardId: string, widget: DbWidget) => void;
  addDashboard: (dashboard: DbDashboard, widgets: DbWidget[]) => void;
  setPickerOpen: (open: boolean) => void;
  dismissInsight: () => void;
  setHydrated: (v: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeDashboardId: null,
  dashboards: [],
  pickerOpen: false,
  insightDismissed: false,
  hydrated: false,
  setDashboards: (dashboards) =>
    set((state) => ({
      dashboards,
      activeDashboardId:
        state.activeDashboardId &&
        dashboards.some((d) => d.id === state.activeDashboardId)
          ? state.activeDashboardId
          : dashboards.find((d) => d.is_default)?.id ?? dashboards[0]?.id ?? null,
      hydrated: true,
    })),
  setActiveDashboard: (id) => set({ activeDashboardId: id }),
  addWidget: (dashboardId, widget) =>
    set((state) => ({
      dashboards: state.dashboards.map((d) =>
        d.id === dashboardId
          ? { ...d, widgets: [...d.widgets.filter((w) => w.id !== widget.id), widget] }
          : d
      ),
    })),
  addDashboard: (dashboard, widgets) =>
    set((state) => ({
      dashboards: [...state.dashboards.filter((d) => d.id !== dashboard.id), { ...dashboard, widgets }],
    })),
  setPickerOpen: (open) => set({ pickerOpen: open }),
  dismissInsight: () => set({ insightDismissed: true }),
  setHydrated: (v) => set({ hydrated: v }),
}));

export function useActiveDashboard(): DashboardWithWidgets | null {
  const dashboards = useDashboardStore((s) => s.dashboards);
  const activeId = useDashboardStore((s) => s.activeDashboardId);
  return dashboards.find((d) => d.id === activeId) ?? dashboards[0] ?? null;
}

/** @deprecated use activeDashboardId */
export function useDashboardActiveTab(): string {
  return useDashboardStore((s) => s.activeDashboardId ?? "");
}

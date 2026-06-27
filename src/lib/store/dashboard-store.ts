import { create } from "zustand";

import type { DashboardWithWidgets, DbDashboard, DbWidget } from "@/lib/dashboard/types";
import {
  persistActiveDashboardId,
  readStoredActiveDashboardId,
  clearStoredActiveDashboardId,
} from "@/lib/store/active-dashboard";

interface DashboardState {
  activeDashboardId: string | null;
  dashboards: DashboardWithWidgets[];
  pickerOpen: boolean;
  createModalOpen: boolean;
  insightDismissed: boolean;
  hydrated: boolean;
  setDashboards: (dashboards: DashboardWithWidgets[]) => void;
  setActiveDashboard: (id: string) => void;
  addWidget: (dashboardId: string, widget: DbWidget) => void;
  addDashboard: (dashboard: DbDashboard, widgets: DbWidget[]) => void;
  removeWidget: (dashboardId: string, widgetId: string) => void;
  removeDashboard: (dashboardId: string) => void;
  setPickerOpen: (open: boolean) => void;
  setCreateModalOpen: (open: boolean) => void;
  dismissInsight: () => void;
  setHydrated: (v: boolean) => void;
}

function resolveActiveId(
  dashboards: DashboardWithWidgets[],
  currentId: string | null
): string | null {
  if (dashboards.length === 0) return null;

  if (currentId && dashboards.some((d) => d.id === currentId)) {
    return currentId;
  }

  const stored = readStoredActiveDashboardId();
  if (stored && dashboards.some((d) => d.id === stored)) {
    return stored;
  }

  return dashboards[0]?.id ?? null;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeDashboardId: null,
  dashboards: [],
  pickerOpen: false,
  createModalOpen: false,
  insightDismissed: false,
  hydrated: false,
  setDashboards: (dashboards) =>
    set((state) => {
      const activeDashboardId = resolveActiveId(dashboards, state.activeDashboardId);
      if (activeDashboardId) {
        persistActiveDashboardId(activeDashboardId);
      }
      return {
        dashboards,
        activeDashboardId,
        hydrated: true,
      };
    }),
  setActiveDashboard: (id) => {
    persistActiveDashboardId(id);
    set({ activeDashboardId: id });
  },
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
      dashboards: [
        ...state.dashboards.filter((d) => d.id !== dashboard.id),
        { ...dashboard, widgets },
      ],
    })),
  removeWidget: (dashboardId, widgetId) =>
    set((state) => ({
      dashboards: state.dashboards.map((d) =>
        d.id === dashboardId
          ? { ...d, widgets: d.widgets.filter((w) => w.id !== widgetId) }
          : d
      ),
    })),
  removeDashboard: (dashboardId) =>
    set((state) => {
      const dashboards = state.dashboards.filter((d) => d.id !== dashboardId);
      const activeDashboardId = resolveActiveId(
        dashboards,
        state.activeDashboardId === dashboardId ? null : state.activeDashboardId
      );
      if (activeDashboardId) {
        persistActiveDashboardId(activeDashboardId);
      } else {
        clearStoredActiveDashboardId();
      }
      return { dashboards, activeDashboardId };
    }),
  setPickerOpen: (open) => set({ pickerOpen: open }),
  setCreateModalOpen: (open) => set({ createModalOpen: open }),
  dismissInsight: () => set({ insightDismissed: true }),
  setHydrated: (v) => set({ hydrated: v }),
}));

export function useActiveDashboard(): DashboardWithWidgets | null {
  const dashboards = useDashboardStore((s) => s.dashboards);
  const activeId = useDashboardStore((s) => s.activeDashboardId);
  if (!activeId) return null;
  return dashboards.find((d) => d.id === activeId) ?? null;
}

/** @deprecated use activeDashboardId */
export function useDashboardActiveTab(): string {
  return useDashboardStore((s) => s.activeDashboardId ?? "");
}

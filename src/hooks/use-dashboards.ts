"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { DashboardWithWidgets } from "@/lib/dashboard/types";

export type WidgetLayoutPayload = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

async function fetchDashboards(): Promise<DashboardWithWidgets[]> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) throw new Error("Failed to load dashboards");
  const data = (await res.json()) as { dashboards: DashboardWithWidgets[] };
  return data.dashboards;
}

export function useDashboards() {
  return useQuery({
    queryKey: ["dashboards"],
    queryFn: fetchDashboards,
  });
}

export function useInvalidateDashboards() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["dashboards"] });
}

export function useSyncDashboardLayoutsInCache() {
  const qc = useQueryClient();

  return useCallback(
    (dashboardId: string, layouts: WidgetLayoutPayload[]) => {
      qc.setQueryData<DashboardWithWidgets[]>(["dashboards"], (prev) => {
        if (!prev) return prev;

        return prev.map((dashboard) =>
          dashboard.id !== dashboardId
            ? dashboard
            : {
                ...dashboard,
                widgets: dashboard.widgets.map((widget) => {
                  const next = layouts.find((layout) => layout.id === widget.id);
                  if (!next) return widget;
                  return {
                    ...widget,
                    layout: {
                      x: next.x,
                      y: next.y,
                      w: next.w,
                      h: next.h,
                    },
                  };
                }),
              }
        );
      });
    },
    [qc]
  );
}

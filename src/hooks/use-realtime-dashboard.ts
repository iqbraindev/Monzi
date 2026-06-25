"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

import { createClient } from "@/lib/supabase/client";
import type { DbDashboard, DbWidget } from "@/lib/dashboard/types";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { useInvalidateDashboards } from "@/hooks/use-dashboards";

export function useRealtimeDashboard() {
  const { userId } = useAuth();
  const addWidget = useDashboardStore((s) => s.addWidget);
  const addDashboard = useDashboardStore((s) => s.addDashboard);
  const setActiveDashboard = useDashboardStore((s) => s.setActiveDashboard);
  const invalidate = useInvalidateDashboards();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`user:${userId}`)
      .on("broadcast", { event: "widget:created" }, ({ payload }) => {
        const p = payload as { widget: DbWidget; dashboardId: string };
        if (p?.widget && p?.dashboardId) {
          addWidget(p.dashboardId, p.widget);
          invalidate();
        }
      })
      .on("broadcast", { event: "dashboard:created" }, ({ payload }) => {
        const p = payload as {
          dashboard: DbDashboard;
          widgets: DbWidget[];
          autoSwitch?: boolean;
        };
        if (p?.dashboard) {
          addDashboard(p.dashboard, p.widgets ?? []);
          if (p.autoSwitch) setActiveDashboard(p.dashboard.id);
          invalidate();
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, addWidget, addDashboard, setActiveDashboard, invalidate]);
}

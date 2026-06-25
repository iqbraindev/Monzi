"use client";

import { useEffect } from "react";

import { useDashboards } from "@/hooks/use-dashboards";
import { useDashboardStore } from "@/lib/store/dashboard-store";

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { data, isSuccess } = useDashboards();
  const setDashboards = useDashboardStore((s) => s.setDashboards);

  useEffect(() => {
    if (isSuccess && data) {
      setDashboards(data);
    }
  }, [isSuccess, data, setDashboards]);

  return <>{children}</>;
}

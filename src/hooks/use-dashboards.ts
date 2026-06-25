"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { DashboardWithWidgets } from "@/lib/dashboard/types";

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

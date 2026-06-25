import { useQuery } from "@tanstack/react-query";

import type { DashboardWidgetId } from "@/lib/aria/types";

async function fetchWidgetData(widgetId: DashboardWidgetId) {
  const res = await fetch("/api/composio/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ widgetId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error ?? "Failed to load widget data") as Error & {
      code?: string;
      toolkit?: string;
    };
    err.code = body.code;
    err.toolkit = body.toolkit;
    throw err;
  }

  return res.json() as Promise<{ data: unknown; tool: string; widgetId: string }>;
}

export function useWidgetData<T = unknown>(widgetId: DashboardWidgetId) {
  return useQuery({
    queryKey: ["widget-data", widgetId],
    queryFn: () => fetchWidgetData(widgetId),
    select: (payload) => payload.data as T,
    staleTime: 60_000,
    retry: 1,
  });
}

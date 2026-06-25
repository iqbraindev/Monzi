"use client";

import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard";

export function AgentDashboardBridge() {
  useRealtimeDashboard();
  return null;
}

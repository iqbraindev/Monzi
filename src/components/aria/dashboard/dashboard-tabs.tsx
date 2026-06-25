"use client";

import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/lib/store/dashboard-store";

export function DashboardTabs() {
  const dashboards = useDashboardStore((s) => s.dashboards);
  const activeDashboardId = useDashboardStore((s) => s.activeDashboardId);
  const setActiveDashboard = useDashboardStore((s) => s.setActiveDashboard);
  const setPickerOpen = useDashboardStore((s) => s.setPickerOpen);
  const hydrated = useDashboardStore((s) => s.hydrated);

  if (!hydrated) {
    return (
      <div className="shrink-0 px-6 pt-4 pb-1">
        <div className="h-[38px] w-64 animate-pulse rounded-lg bg-aria-subtle/40" />
      </div>
    );
  }

  return (
    <div className="shrink-0">
      <div className="flex items-center gap-1 overflow-x-auto px-6 pt-4 pb-1">
        {dashboards.map((tab) => {
          const active = tab.id === activeDashboardId;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveDashboard(tab.id)}
              className={cn(
                "flex h-[38px] items-center gap-1.5 border-b-2 px-3.5 text-sm whitespace-nowrap transition-colors",
                active
                  ? "border-aria-primary font-semibold text-aria-text"
                  : "border-transparent font-medium text-aria-text-secondary hover:text-aria-text"
              )}
            >
              <span>{tab.created_by === "agent" ? "✨" : tab.icon ?? "📊"}</span>
              <span>{tab.name}</span>
            </button>
          );
        })}
        <button
          onClick={() => setPickerOpen(true)}
          className="ml-2 flex h-[30px] items-center gap-1.5 rounded-full border border-dashed border-aria-border px-3 text-[13px] font-medium whitespace-nowrap text-aria-text-secondary transition-colors hover:border-aria-primary hover:text-aria-primary-light"
        >
          <Plus className="size-3.5" />
          Add widget
        </button>
      </div>
      <div className="mx-6 h-px bg-aria-border-subtle" />
    </div>
  );
}

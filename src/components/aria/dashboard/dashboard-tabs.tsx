"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { useInvalidateDashboards } from "@/hooks/use-dashboards";

export function DashboardTabs() {
  const dashboards = useDashboardStore((s) => s.dashboards);
  const activeDashboardId = useDashboardStore((s) => s.activeDashboardId);
  const setActiveDashboard = useDashboardStore((s) => s.setActiveDashboard);
  const setPickerOpen = useDashboardStore((s) => s.setPickerOpen);
  const setCreateModalOpen = useDashboardStore((s) => s.setCreateModalOpen);
  const removeDashboard = useDashboardStore((s) => s.removeDashboard);
  const hydrated = useDashboardStore((s) => s.hydrated);
  const invalidate = useInvalidateDashboards();
  const [deleting, setDeleting] = useState(false);

  if (!hydrated) {
    return (
      <div className="shrink-0 px-6 pt-4 pb-1">
        <div className="h-[38px] w-64 animate-pulse rounded-lg bg-aria-subtle/40" />
      </div>
    );
  }

  if (dashboards.length === 0) {
    return null;
  }

  const hasActive = Boolean(activeDashboardId);
  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId);

  const handleDeleteDashboard = async () => {
    if (!activeDashboard || deleting) return;

    const confirmed = window.confirm(
      `Delete "${activeDashboard.name}"? All widgets on this dashboard will be removed. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/dashboard/${encodeURIComponent(activeDashboard.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to delete dashboard");
      }
      removeDashboard(activeDashboard.id);
      invalidate();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to delete dashboard"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="shrink-0">
      <div className="flex items-center gap-3 px-6 pt-4 pb-1">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
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
            onClick={() => setCreateModalOpen(true)}
            className="ml-2 flex h-[30px] items-center gap-1.5 rounded-full border border-dashed border-aria-border px-3 text-[13px] font-medium whitespace-nowrap text-aria-text-secondary transition-colors hover:border-aria-primary hover:text-aria-primary-light"
          >
            <Plus className="size-3.5" />
            New dashboard
          </button>
          <button
            onClick={() => setPickerOpen(true)}
            disabled={!hasActive}
            className="ml-1 flex h-[30px] items-center gap-1.5 rounded-full border border-dashed border-aria-border px-3 text-[13px] font-medium whitespace-nowrap text-aria-text-secondary transition-colors hover:border-aria-primary hover:text-aria-primary-light disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus className="size-3.5" />
            Add widget
          </button>
        </div>
        {activeDashboard && (
          <button
            type="button"
            onClick={() => void handleDeleteDashboard()}
            disabled={deleting}
            title="Delete the current dashboard"
            aria-label="Delete the current dashboard"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-aria-danger/35 text-aria-danger transition-colors hover:border-aria-danger/60 hover:bg-aria-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      <div className="mx-6 h-px bg-aria-border-subtle" />
    </div>
  );
}

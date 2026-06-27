"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { Trash2 } from "lucide-react";

import { useActiveDashboard, useDashboardStore } from "@/lib/store/dashboard-store";
import type { DbWidget } from "@/lib/dashboard/types";
import type { DashboardWidgetId } from "@/lib/aria/types";
import { EmailWidget } from "@/components/aria/dashboard/email-widget";
import { TasksWidget } from "@/components/aria/dashboard/tasks-widget";
import { CalendarWidget } from "@/components/aria/dashboard/calendar-widget";
import { RevenueWidget } from "@/components/aria/dashboard/revenue-widget";
import { PipelineWidget } from "@/components/aria/dashboard/pipeline-widget";
import { InsightsWidget } from "@/components/aria/dashboard/insights-widget";
import { AddWidgetCard } from "@/components/aria/dashboard/add-widget-card";
import { cn } from "@/lib/utils";

const WIDGET_COMPONENTS: Record<string, ComponentType> = {
  email: EmailWidget,
  tasks: TasksWidget,
  calendar: CalendarWidget,
  revenue: RevenueWidget,
  pipeline: PipelineWidget,
  insights: InsightsWidget,
};

function colSpan(w: number): string {
  const clamped = Math.min(12, Math.max(1, w));
  const map: Record<number, string> = {
    1: "col-span-1",
    2: "col-span-2",
    3: "col-span-3",
    4: "col-span-4",
    5: "col-span-5",
    6: "col-span-6",
    7: "col-span-7",
    8: "col-span-8",
    9: "col-span-9",
    10: "col-span-10",
    11: "col-span-11",
    12: "col-span-12",
  };
  return map[clamped] ?? "col-span-6";
}

function DbWidgetCell({ widget }: { widget: DbWidget }) {
  const Component = WIDGET_COMPONENTS[widget.type];
  if (!Component) {
    return (
      <div
        className="aria-glass flex flex-col overflow-hidden rounded-2xl border border-aria-border-subtle p-4"
      >
        <p className="font-heading text-[15px] font-semibold text-aria-text">
          {widget.title}
        </p>
        <p className="mt-2 text-xs text-aria-text-muted">
          Widget type &ldquo;{widget.type}&rdquo; is not supported yet.
        </p>
      </div>
    );
  }

  return <Component />;
}

function WidgetCellWrapper({
  widget,
  onDelete,
  deleting,
}: {
  widget: DbWidget;
  onDelete: (widgetId: string) => void;
  deleting: boolean;
}) {
  return (
    <div className={cn(colSpan(widget.layout?.w ?? 6), "group relative")}>
      <button
        type="button"
        disabled={deleting}
        onClick={() => onDelete(widget.id)}
        aria-label={`Remove ${widget.title}`}
        className="absolute right-3 top-3 z-20 flex size-8 items-center justify-center rounded-lg border border-aria-border bg-aria-elevated/95 text-aria-text-secondary opacity-0 shadow-sm transition-all hover:border-aria-danger/40 hover:bg-aria-danger/10 hover:text-aria-danger group-hover:opacity-100 disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>
      <DbWidgetCell widget={widget} />
    </div>
  );
}

export function DashboardGrid() {
  const active = useActiveDashboard();
  const hydrated = useDashboardStore((s) => s.hydrated);
  const dashboards = useDashboardStore((s) => s.dashboards);
  const setPickerOpen = useDashboardStore((s) => s.setPickerOpen);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!hydrated || dashboards.length === 0 || !active) {
    return null;
  }

  const widgets = active.widgets;

  const handleDeleteWidget = async (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget || deletingId) return;

    const confirmed = window.confirm(
      `Remove "${widget.title}" from this dashboard?`
    );
    if (!confirmed) return;

    setDeletingId(widgetId);
    try {
      const res = await fetch(
        `/api/dashboard/${active.id}/widgets/${encodeURIComponent(widgetId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to remove widget");
      }
      removeWidget(active.id, widgetId);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to remove widget"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      key={active.id}
      className="aria-slide-up grid grid-cols-12 content-start gap-4 px-6 pt-5 pb-8"
    >
      {widgets.map((widget) => (
        <WidgetCellWrapper
          key={widget.id}
          widget={widget}
          deleting={deletingId === widget.id}
          onDelete={(id) => void handleDeleteWidget(id)}
        />
      ))}
      <div className="col-span-3">
        <AddWidgetCard onAdd={() => setPickerOpen(true)} />
      </div>
    </div>
  );
}

/** Legacy export for types referencing DashboardWidgetId */
export const LEGACY_WIDGET_IDS: DashboardWidgetId[] = [
  "email",
  "tasks",
  "calendar",
  "revenue",
  "pipeline",
  "insights",
  "add",
];

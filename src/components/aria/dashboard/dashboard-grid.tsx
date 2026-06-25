"use client";

import type { ComponentType } from "react";

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
        className={cn(
          colSpan(widget.layout?.w ?? 6),
          "aria-glass flex flex-col overflow-hidden rounded-2xl border border-aria-border-subtle p-4"
        )}
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

  return (
    <div className={colSpan(widget.layout?.w ?? 6)}>
      <Component />
    </div>
  );
}

export function DashboardGrid() {
  const active = useActiveDashboard();
  const hydrated = useDashboardStore((s) => s.hydrated);
  const setPickerOpen = useDashboardStore((s) => s.setPickerOpen);

  if (!hydrated) {
    return (
      <div className="grid grid-cols-12 gap-4 px-6 pt-5 pb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="col-span-6 h-48 animate-pulse rounded-2xl bg-aria-subtle/40"
          />
        ))}
      </div>
    );
  }

  const widgets = active?.widgets ?? [];

  return (
    <div
      key={active?.id ?? "empty"}
      className="aria-slide-up grid grid-cols-12 content-start gap-4 px-6 pt-5 pb-8"
    >
      {widgets.map((widget) => (
        <DbWidgetCell key={widget.id} widget={widget} />
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

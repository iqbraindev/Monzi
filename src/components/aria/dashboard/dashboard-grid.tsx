"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout/legacy";
import { GripVertical, Trash2 } from "lucide-react";

import { useActiveDashboard, useDashboardStore } from "@/lib/store/dashboard-store";
import type { DbWidget } from "@/lib/dashboard/types";
import type { DashboardWidgetId } from "@/lib/aria/types";
import {
  GRID_COLS,
  GRID_MARGIN,
  GRID_ROW_HEIGHT,
  gridLayoutToWidgetLayouts,
  widgetsToGridLayout,
} from "@/lib/dashboard/layout-utils";
import { EmailWidget } from "@/components/aria/dashboard/email-widget";
import { TasksWidget } from "@/components/aria/dashboard/tasks-widget";
import { CalendarWidget } from "@/components/aria/dashboard/calendar-widget";
import { RevenueWidget } from "@/components/aria/dashboard/revenue-widget";
import { PipelineWidget } from "@/components/aria/dashboard/pipeline-widget";
import { InsightsWidget } from "@/components/aria/dashboard/insights-widget";
import { AddWidgetCard } from "@/components/aria/dashboard/add-widget-card";
import {
  useInvalidateDashboards,
  useSyncDashboardLayoutsInCache,
} from "@/hooks/use-dashboards";
import { cn } from "@/lib/utils";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./dashboard-grid.css";

const GridLayoutWithWidth = WidthProvider(GridLayout);
const EMPTY_WIDGETS: DbWidget[] = [];

const WIDGET_COMPONENTS: Record<string, ComponentType> = {
  email: EmailWidget,
  tasks: TasksWidget,
  calendar: CalendarWidget,
  revenue: RevenueWidget,
  pipeline: PipelineWidget,
  insights: InsightsWidget,
};

type SaveState = "idle" | "saving" | "saved" | "error";

function DbWidgetCell({ widget }: { widget: DbWidget }) {
  const Component = WIDGET_COMPONENTS[widget.type];
  if (!Component) {
    return (
      <div className="aria-glass flex h-full flex-col overflow-hidden rounded-2xl border border-aria-border-subtle p-4">
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
    <div className="group relative h-full w-full">
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
  const updateWidgetLayouts = useDashboardStore((s) => s.updateWidgetLayouts);
  const invalidate = useInvalidateDashboards();
  const syncLayoutsInCache = useSyncDashboardLayoutsInCache();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>([]);
  const [gridReady, setGridReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const layoutRef = useRef<Layout>([]);
  const isInteractingRef = useRef(false);
  const initializedKeyRef = useRef("");

  const widgets = active?.widgets ?? EMPTY_WIDGETS;

  const widgetSetKey = useMemo(
    () =>
      widgets
        .map((widget) => widget.id)
        .sort()
        .join(","),
    [widgets]
  );

  useEffect(() => {
    if (!active) {
      setGridReady(false);
      setLayout([]);
      layoutRef.current = [];
      initializedKeyRef.current = "";
      return;
    }

    const initKey = `${active.id}:${widgetSetKey}`;
    if (initializedKeyRef.current === initKey) return;

    initializedKeyRef.current = initKey;
    const next = widgetsToGridLayout(active.widgets);
    layoutRef.current = next;
    setLayout(next);
    setGridReady(next.length === active.widgets.length);
  }, [active, widgetSetKey]);

  const handleLayoutChange = useCallback((nextLayout: Layout) => {
    if (!isInteractingRef.current) return;
    layoutRef.current = nextLayout;
    setLayout(nextLayout);
  }, []);

  const persistLayout = useCallback(
    async (nextLayout: Layout) => {
      if (!active) return;

      const payloads = gridLayoutToWidgetLayouts(nextLayout);
      updateWidgetLayouts(active.id, payloads);
      syncLayoutsInCache(active.id, payloads);
      setSaveState("saving");

      try {
        const res = await fetch(`/api/dashboard/${active.id}/layout`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layouts: payloads }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Failed to save layout");
        }
        setSaveState("saved");
        window.setTimeout(() => setSaveState("idle"), 2000);
      } catch (err) {
        setSaveState("error");
        initializedKeyRef.current = "";
        invalidate();
        window.alert(
          err instanceof Error ? err.message : "Failed to save layout"
        );
      }
    },
    [active, invalidate, syncLayoutsInCache, updateWidgetLayouts]
  );

  const handleLayoutCommit = useCallback(
    (nextLayout: Layout) => {
      isInteractingRef.current = false;
      layoutRef.current = nextLayout;
      setLayout(nextLayout);
      void persistLayout(nextLayout);
    },
    [persistLayout]
  );

  const handleDeleteWidget = async (widgetId: string) => {
    if (!active) return;
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
      initializedKeyRef.current = "";
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to remove widget"
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!hydrated || dashboards.length === 0 || !active) {
    return null;
  }

  return (
    <div key={active.id} className="aria-slide-up px-6 pt-5 pb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-aria-text-muted">
          <GripVertical className="size-3.5" />
          Drag headers to move · resize from the bottom-right corner
        </p>
        <span
          className={cn(
            "text-[11px] font-medium transition-opacity",
            saveState === "idle" ? "opacity-0" : "opacity-100",
            saveState === "error" ? "text-aria-danger" : "text-aria-text-muted"
          )}
        >
          {saveState === "saving" && "Saving layout…"}
          {saveState === "saved" && "Layout saved"}
          {saveState === "error" && "Could not save layout"}
        </span>
      </div>

      {gridReady ? (
        <GridLayoutWithWidth
          className="dashboard-grid"
          layout={layout}
          cols={GRID_COLS}
          rowHeight={GRID_ROW_HEIGHT}
          margin={GRID_MARGIN}
          containerPadding={[0, 0]}
          isDraggable
          isResizable
          compactType="vertical"
          draggableHandle=".widget-drag-handle"
          draggableCancel="button, a, input, textarea, select, [role='button']"
          onLayoutChange={handleLayoutChange}
          onDragStart={() => {
            isInteractingRef.current = true;
          }}
          onResizeStart={() => {
            isInteractingRef.current = true;
          }}
          onDragStop={handleLayoutCommit}
          onResizeStop={handleLayoutCommit}
        >
          {widgets.map((widget) => (
            <div key={widget.id}>
              <WidgetCellWrapper
                widget={widget}
                deleting={deletingId === widget.id}
                onDelete={(id) => void handleDeleteWidget(id)}
              />
            </div>
          ))}
        </GridLayoutWithWidth>
      ) : (
        <div className="min-h-[320px] rounded-2xl border border-dashed border-aria-border-subtle bg-aria-subtle/20" />
      )}

      <div className="mt-4 max-w-xs">
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

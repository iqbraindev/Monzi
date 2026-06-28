import type { Layout } from "react-grid-layout/legacy";

import type { DbWidget, WidgetLayout } from "@/lib/dashboard/types";

export const GRID_COLS = 12;
export const GRID_ROW_HEIGHT = 56;
export const GRID_MARGIN: [number, number] = [16, 16];
/** Sentinel y for widgets that should auto-stack on first render. */
export const AUTO_PLACE_LAYOUT_Y = 999;

export function isAutoPlaceLayoutY(y: number | undefined | null): boolean {
  return typeof y !== "number" || y >= AUTO_PLACE_LAYOUT_Y;
}

export const WIDGET_LAYOUT_CONSTRAINTS: Record<
  string,
  { minW: number; minH: number; maxW?: number; maxH?: number }
> = {
  email: { minW: 4, minH: 4, maxW: 12, maxH: 8 },
  tasks: { minW: 3, minH: 3, maxW: 8, maxH: 8 },
  calendar: { minW: 3, minH: 3, maxW: 6, maxH: 8 },
  revenue: { minW: 4, minH: 3, maxW: 12, maxH: 6 },
  pipeline: { minW: 4, minH: 3, maxW: 12, maxH: 8 },
  insights: { minW: 3, minH: 3, maxW: 12, maxH: 8 },
};

export function defaultWidgetLayout(type: string): WidgetLayout {
  const constraints = WIDGET_LAYOUT_CONSTRAINTS[type];
  return {
    x: 0,
    y: 0,
    w: constraints?.minW ? Math.max(constraints.minW, 6) : 6,
    h: constraints?.minH ? Math.max(constraints.minH, 4) : 4,
  };
}

export function coerceWidgetLayout(
  layout: unknown,
  type: string
): WidgetLayout {
  let value = layout;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return defaultWidgetLayout(type);
    }
  }

  if (value && typeof value === "object") {
    const candidate = value as Partial<WidgetLayout>;
    if (
      typeof candidate.x === "number" &&
      typeof candidate.y === "number" &&
      typeof candidate.w === "number" &&
      typeof candidate.h === "number"
    ) {
      return {
        x: candidate.x,
        y: candidate.y,
        w: candidate.w,
        h: candidate.h,
      };
    }
  }

  return defaultWidgetLayout(type);
}

export function widgetsToGridLayout(widgets: DbWidget[]): Layout {
  let row = 0;

  return widgets.map((widget) => {
    const layout = coerceWidgetLayout(widget.layout, widget.type);
    const constraints = WIDGET_LAYOUT_CONSTRAINTS[widget.type] ?? {
      minW: 3,
      minH: 3,
    };
    const maxW = constraints.maxW ?? GRID_COLS;
    const maxH = constraints.maxH ?? 12;
    const w = Math.min(maxW, Math.max(constraints.minW, layout.w ?? 6));
    const h = Math.min(maxH, Math.max(constraints.minH, layout.h ?? 4));
    const y = isAutoPlaceLayoutY(layout.y) ? row : layout.y;
    row = Math.max(row, y + h);

    return {
      i: widget.id,
      x: Math.max(0, Math.min(GRID_COLS - w, layout.x ?? 0)),
      y,
      w,
      h,
      minW: constraints.minW,
      minH: constraints.minH,
      maxW: constraints.maxW,
      maxH: constraints.maxH,
    };
  });
}

export function gridLayoutToWidgetLayouts(
  layout: Layout
): Array<{ id: string; x: number; y: number; w: number; h: number }> {
  return layout.map(({ i, x, y, w, h, minW, minH, maxW, maxH }) => {
    const safeW = Math.max(minW ?? 1, w);
    const safeH = Math.max(minH ?? 1, h);
    const cappedW =
      typeof maxW === "number" ? Math.min(maxW, safeW) : safeW;
    const cappedH =
      typeof maxH === "number" ? Math.min(maxH, safeH) : safeH;

    return {
      id: i,
      x,
      y,
      w: cappedW,
      h: cappedH,
    };
  });
}

export function gridLayoutsEqual(a: Layout, b: Layout): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((item) => [item.i, item]));
  return a.every((item) => {
    const other = byId.get(item.i);
    if (!other) return false;
    return (
      item.x === other.x &&
      item.y === other.y &&
      item.w === other.w &&
      item.h === other.h
    );
  });
}

export function widgetsLayoutKey(widgets: DbWidget[]): string {
  return widgets
    .map((w) => {
      const l = coerceWidgetLayout(w.layout, w.type);
      return `${w.id}:${l.x},${l.y},${l.w},${l.h}`;
    })
    .join("|");
}

export function normalizeLayoutY(
  layout: WidgetLayout,
  fallbackY: number
): number {
  if (isAutoPlaceLayoutY(layout.y)) return fallbackY;
  return layout.y;
}

export function nextLayoutRow(widgets: Array<{ layout?: WidgetLayout | null }>): number {
  return widgets.reduce((max, widget) => {
    const layout = widget.layout;
    if (!layout) return max;
    const y = normalizeLayoutY(layout, 0);
    return Math.max(max, y + (layout.h ?? 4));
  }, 0);
}

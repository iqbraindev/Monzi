"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useActiveDashboard, useDashboardStore } from "@/lib/store/dashboard-store";
import { WIDGET_CATEGORIES, WIDGET_OPTIONS } from "@/lib/aria/mock-data";
import { useConnectedToolkits } from "@/hooks/use-composio-connections";
import { useInvalidateDashboards } from "@/hooks/use-dashboards";

const WIDGET_TOOLKIT: Record<string, string> = {
  email: "gmail",
  tasks: "notion",
  calendar: "googlecalendar",
  revenue: "stripe",
  pipeline: "hubspot",
  slack: "slack",
};

export function WidgetPicker() {
  const open = useDashboardStore((s) => s.pickerOpen);
  const setOpen = useDashboardStore((s) => s.setPickerOpen);
  const active = useActiveDashboard();
  const invalidate = useInvalidateDashboards();
  const [category, setCategory] = useState("All");
  const [adding, setAdding] = useState<string | null>(null);
  const { toolkits } = useConnectedToolkits();

  const options = useMemo(
    () =>
      WIDGET_OPTIONS.map((w) => {
        const toolkit = WIDGET_TOOLKIT[w.id];
        if (!toolkit) return w;
        return { ...w, connected: toolkits.has(toolkit) };
      }),
    [toolkits]
  );

  const addWidget = async (type: string, title: string) => {
    if (!active?.id || adding) return;
    setAdding(type);
    try {
      const res = await fetch(`/api/dashboard/${active.id}/widgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title }),
      });
      if (!res.ok) throw new Error("Failed to add widget");
      invalidate();
      setOpen(false);
    } catch {
      // keep picker open on error
    } finally {
      setAdding(null);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      className="aria-pop fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-10 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[20px] border border-aria-border bg-aria-elevated/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-3 border-b border-aria-border px-5 py-4">
          <span className="flex-1 font-heading text-lg font-semibold text-aria-text">
            Add a widget
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-[9px] bg-aria-subtle text-aria-text-secondary hover:text-aria-text"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 pt-3.5">
          <div className="flex h-[38px] items-center gap-2.5 rounded-full border border-aria-border bg-aria-surface px-3.5">
            <Search className="size-[15px] text-aria-text-muted" />
            <span className="text-sm text-aria-text-muted">Search widgets...</span>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto px-5 py-3.5">
          {WIDGET_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "flex h-[30px] shrink-0 items-center rounded-full border px-3 text-[13px] font-medium transition-colors",
                category === c
                  ? "border-aria-primary/40 bg-aria-primary/15 text-aria-primary-light"
                  : "border-aria-border text-aria-text-secondary hover:text-aria-text"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto px-5 pb-5 sm:grid-cols-2 md:grid-cols-3">
          {options.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={!w.connected || adding === w.id}
              onClick={() => void addWidget(w.id, w.name)}
              className={cn(
                "flex flex-col gap-2 rounded-2xl border border-aria-border bg-aria-surface/60 p-3.5 text-left transition-all hover:border-aria-primary hover:bg-aria-primary/8 disabled:cursor-not-allowed",
                !w.connected && "opacity-55"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex size-[30px] items-center justify-center rounded-lg font-heading text-[13px] font-bold text-white"
                  style={{ background: w.logoColor }}
                >
                  {w.logo}
                </span>
                <span className="text-sm font-semibold text-aria-text">
                  {w.name}
                </span>
              </div>
              <span className="flex-1 text-xs leading-normal text-aria-text-secondary">
                {w.description}
              </span>
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  w.connected ? "text-aria-primary-light" : "text-aria-warning"
                )}
              >
                {adding === w.id
                  ? "Adding…"
                  : w.connected
                    ? "+ Add widget"
                    : w.connectLabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

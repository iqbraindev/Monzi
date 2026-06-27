"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { useInvalidateDashboards } from "@/hooks/use-dashboards";

const ICON_OPTIONS = ["📊", "💼", "👥", "💰", "📅", "✨", "🎯", "📧"];

export function CreateDashboardModal() {
  const open = useDashboardStore((s) => s.createModalOpen);
  const setOpen = useDashboardStore((s) => s.setCreateModalOpen);
  const setActiveDashboard = useDashboardStore((s) => s.setActiveDashboard);
  const invalidate = useInvalidateDashboards();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📊");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setName("");
    setIcon("📊");
    setError(null);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, icon }),
      });
      const data = (await res.json()) as { dashboard?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create dashboard");

      invalidate();
      if (data.dashboard?.id) {
        setActiveDashboard(data.dashboard.id);
      }
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={close}
      className="aria-pop fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-10 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[420px] flex-col overflow-hidden rounded-[20px] border border-aria-border bg-aria-elevated/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-3 border-b border-aria-border px-5 py-4">
          <span className="flex-1 font-heading text-lg font-semibold text-aria-text">
            New dashboard
          </span>
          <button
            onClick={close}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-[9px] bg-aria-subtle text-aria-text-secondary hover:text-aria-text"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-aria-text-secondary">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work, Clients, Finance"
              className="h-10 rounded-xl border border-aria-border bg-aria-surface px-3 text-sm text-aria-text outline-none focus:border-aria-primary/50"
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-aria-text-secondary">Icon</span>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl border text-lg transition-colors",
                    icon === emoji
                      ? "border-aria-primary/50 bg-aria-primary/15"
                      : "border-aria-border bg-aria-surface hover:border-aria-primary/30"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-aria-danger">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-aria-border px-5 py-4">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="h-9 rounded-full px-4 text-sm font-medium text-aria-text-secondary hover:text-aria-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!name.trim() || submitting}
            className="h-9 rounded-full border border-aria-primary/40 bg-aria-primary/15 px-5 text-sm font-semibold text-aria-primary-light transition-colors hover:bg-aria-primary/25 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

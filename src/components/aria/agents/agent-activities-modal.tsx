"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface AgentActivityItem {
  icon: string;
  label: string;
  href?: string;
}

export function AgentActivitiesModal({
  open,
  onClose,
  dashActions,
  toolActions,
}: {
  open: boolean;
  onClose: () => void;
  dashActions: AgentActivityItem[];
  toolActions: { label: string }[];
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activities-modal-title"
    >
      <button
        type="button"
        aria-label="Close activities"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-[1] flex max-h-[min(80vh,640px)] w-full max-w-md flex-col",
          "rounded-[18px] border border-aria-border bg-aria-surface shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
        )}
      >
        <div className="flex items-center justify-between border-b border-aria-border-subtle px-5 py-4">
          <div>
            <h2
              id="activities-modal-title"
              className="font-heading text-lg font-semibold text-aria-text"
            >
              Activities
            </h2>
            <p className="mt-0.5 text-xs text-aria-text-muted">
              Dashboard actions and tool usage from this chat
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-aria-text-muted transition-colors hover:bg-aria-elevated hover:text-aria-text"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-4">
          <section className="flex flex-col gap-2.5">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
              Dashboard actions
            </span>
            {dashActions.length === 0 ? (
              <p className="text-xs text-aria-text-muted">
                Dashboard changes will appear here when your agent updates widgets.
              </p>
            ) : (
              dashActions.map((act) => (
                <Link
                  key={act.label}
                  href={act.href ?? "/dashboard"}
                  onClick={onClose}
                  className="flex items-center gap-2.5 rounded-xl border border-aria-primary/25 bg-aria-primary/8 px-3 py-2.5 transition-colors hover:bg-aria-primary/12"
                >
                  <span className="shrink-0 text-[15px]">{act.icon}</span>
                  <span className="flex-1 text-xs leading-snug text-aria-text">
                    {act.label}
                  </span>
                </Link>
              ))
            )}
          </section>

          <section className="flex flex-col gap-2.5">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
              Tool activity
            </span>
            {toolActions.length === 0 ? (
              <p className="text-xs text-aria-text-muted">
                No related data yet.
              </p>
            ) : (
              toolActions.map((act) => (
                <div
                  key={act.label}
                  className="rounded-xl border border-aria-border-subtle bg-[#16161f] px-3 py-2 text-xs text-slate-300"
                >
                  {act.label}
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

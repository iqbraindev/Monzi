"use client";

import { LayoutDashboard, Plus } from "lucide-react";
import Link from "next/link";

import { useDashboardStore } from "@/lib/store/dashboard-store";

export function DashboardEmptyState() {
  const dashboards = useDashboardStore((s) => s.dashboards);
  const hydrated = useDashboardStore((s) => s.hydrated);
  const setCreateModalOpen = useDashboardStore((s) => s.setCreateModalOpen);

  if (!hydrated || dashboards.length > 0) return null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-aria-border bg-aria-surface/60"
      >
        <LayoutDashboard className="size-8 text-aria-primary-light" />
      </div>
      <h2 className="font-heading text-xl font-semibold text-aria-text">
        Create your first dashboard
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-aria-text-secondary">
        Dashboards are workspaces where you add widgets for email, calendar, tasks,
        and more. Name a dashboard, then add the widgets you need.
      </p>
      <button
        type="button"
        onClick={() => setCreateModalOpen(true)}
        className="mt-6 flex h-10 items-center gap-2 rounded-full border border-aria-primary/40 bg-aria-primary/15 px-5 text-sm font-semibold text-aria-primary-light transition-colors hover:bg-aria-primary/25"
      >
        <Plus className="size-4" />
        Create your first dashboard
      </button>
      <p className="mt-4 text-xs text-aria-text-muted">
        Connect apps in{" "}
        <Link href="/integrations" className="text-aria-primary-light hover:underline">
          Integrations
        </Link>{" "}
        to unlock widgets.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { DbNotification } from "@/lib/notifications/types";
import { useLimits } from "@/hooks/use-workspaces";

export function InsightsWidget() {
  const { data: limitsData } = useLimits();
  const workspaceId = limitsData?.workspaceId as string | undefined;
  const [items, setItems] = useState<DbNotification[]>([]);

  useEffect(() => {
    if (!workspaceId) return;
    void fetch("/api/notifications?limit=5", {
      headers: { "x-monzi-workspace-id": workspaceId },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { notifications?: DbNotification[] } | null) => {
        if (data?.notifications) {
          setItems(
            data.notifications.filter(
              (n) => n.type === "watch" || n.type === "insight"
            )
          );
        }
      })
      .catch(() => {});
  }, [workspaceId]);

  return (
    <section className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-aria-primary/30 bg-linear-[135deg,rgba(124,58,237,0.12),rgba(6,182,212,0.06)] backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-aria-primary/20 px-3 py-3.5">
        <div className="widget-drag-handle flex min-w-0 flex-1 cursor-grab items-center gap-2.5 active:cursor-grabbing">
          <span className="aria-gradient size-6 shrink-0 rounded-full shadow-[0_0_12px_rgba(124,58,237,0.5)]" />
          <span className="truncate font-heading text-[15px] font-semibold text-aria-text">
            Agent Insights
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-aria-primary/15 px-2 py-0.5 text-[11px] font-semibold text-aria-primary-light">
          Live
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto p-4">
        {items.length === 0 ? (
          <p className="text-center text-[13px] text-aria-text-muted">
            No proactive alerts yet. Ask an agent to watch something for you.
          </p>
        ) : (
          items.map((i) => (
            <div
              key={i.id}
              className="flex items-center gap-3 rounded-xl border border-aria-border bg-aria-surface/60 px-3 py-2.5"
            >
              <span className="shrink-0 text-lg">{i.type === "watch" ? "👁" : "✨"}</span>
              <span className="min-w-0 flex-1 text-[13px] leading-snug text-aria-text">
                <strong>{i.title}</strong> — {i.body}
              </span>
              <Link
                href="/watches"
                className="aria-gradient h-[30px] shrink-0 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap text-white transition-[filter] hover:brightness-110"
              >
                View
              </Link>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

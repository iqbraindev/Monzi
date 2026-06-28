"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

import type { TaskItem, TaskPriority } from "@/lib/aria/types";
import {
  WidgetBadge,
  WidgetShell,
} from "@/components/aria/dashboard/widget-shell";
import {
  WidgetConnectCta,
  WidgetErrorState,
  WidgetLoadingState,
} from "@/components/aria/dashboard/widget-data-states";
import { useWidgetConnection } from "@/hooks/use-widget-connection";
import { useWidgetData } from "@/hooks/use-widget-data";

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

export function TasksWidget() {
  const { toolkit, connected, isLoading: connLoading } = useWidgetConnection("tasks");
  const { data, isLoading, error, refetch, isError } = useWidgetData<{
    tasks: TaskItem[];
  }>("tasks", { enabled: connected });

  const [localTasks, setLocalTasks] = useState<TaskItem[] | null>(null);
  const fetched = data?.tasks ?? [];
  const tasks = localTasks ?? fetched;
  const pending = tasks.filter((t) => !t.done).length;
  const notConnected =
    (!connLoading && !connected) ||
    (isError &&
      (error as Error & { code?: string })?.code === "NOT_CONNECTED");

  const toggle = (id: string) =>
    setLocalTasks((prev) => {
      const base = prev ?? tasks;
      return base.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    });

  return (
    <WidgetShell
      logo="N"
      logoColor="#111111"
      title="Tasks"
      span="lg:col-span-4"
      actions={
        connected && !notConnected ? (
          <WidgetBadge>{pending} pending</WidgetBadge>
        ) : undefined
      }
      footer={
        connected && !notConnected && !isLoading ? (
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <button className="text-[13px] text-aria-text-secondary hover:text-aria-text">
              + Add task
            </button>
            <button className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-aria-border bg-aria-elevated px-3 text-xs font-semibold text-aria-primary-light transition-colors hover:border-aria-primary hover:bg-aria-primary/15">
              <Sparkles className="size-3.5" /> Prioritize
            </button>
          </div>
        ) : undefined
      }
    >
      {(connLoading || (connected && isLoading)) && <WidgetLoadingState />}
      {notConnected && toolkit && (
        <WidgetConnectCta
          toolkit={toolkit}
          label="Connect Notion to sync your tasks."
        />
      )}
      {connected && isError && !notConnected && (
        <WidgetErrorState
          message={error?.message ?? "Could not load tasks"}
          onRetry={() => void refetch()}
        />
      )}
      {connected &&
        !isLoading &&
        !notConnected &&
        !isError &&
        tasks.length === 0 && (
          <div className="p-6 text-center text-sm text-aria-text-muted">
            No tasks to show.
          </div>
        )}
      {connected &&
        !isLoading &&
        !notConnected &&
        !isError &&
        tasks.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 border-b border-aria-border-subtle/60 px-4 py-2.5 last:border-0"
          >
            <button
              onClick={() => toggle(t.id)}
              aria-label={t.done ? "Mark incomplete" : "Mark complete"}
              className="flex size-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px] transition-all"
              style={{
                borderColor: t.done ? "#7C3AED" : "#2A2A3E",
                background: t.done ? "#7C3AED" : "transparent",
              }}
            >
              {t.done && (
                <Check className="size-3 text-white" strokeWidth={3.5} />
              )}
            </button>
            <span
              className={`min-w-0 flex-1 truncate text-[13px] ${t.done ? "text-aria-text-muted line-through" : "text-aria-text"}`}
            >
              {t.name}
            </span>
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold"
              style={{
                color: t.overdue ? "#EF4444" : "#94A3B8",
                background: t.overdue ? "rgba(239,68,68,0.14)" : "#1E1E2E",
              }}
            >
              {t.due}
            </span>
            <span
              className="size-[7px] shrink-0 rounded-full"
              style={{ background: PRIORITY_COLOR[t.priority] }}
            />
          </div>
        ))}
    </WidgetShell>
  );
}

"use client";

import type { CalendarEvent } from "@/lib/aria/types";
import { WidgetShell } from "@/components/aria/dashboard/widget-shell";
import {
  WidgetConnectCta,
  WidgetErrorState,
  WidgetLoadingState,
} from "@/components/aria/dashboard/widget-data-states";
import { useWidgetConnection } from "@/hooks/use-widget-connection";
import { useWidgetData } from "@/hooks/use-widget-data";

export function CalendarWidget() {
  const { toolkit, connected, isLoading: connLoading } =
    useWidgetConnection("calendar");
  const { data, isLoading, error, refetch, isError } = useWidgetData<{
    events: CalendarEvent[];
  }>("calendar", { enabled: connected });

  const events = data?.events ?? [];
  const notConnected =
    (!connLoading && !connected) ||
    (isError &&
      (error as Error & { code?: string })?.code === "NOT_CONNECTED");

  return (
    <WidgetShell
      logo="31"
      logoColor="#1A73E8"
      title="Today"
      span="lg:col-span-3"
      actions={
        <span className="font-mono text-[11px] text-aria-text-muted">
          {new Date().toLocaleDateString([], { month: "short", day: "numeric" })}
        </span>
      }
    >
      {(connLoading || (connected && isLoading)) && <WidgetLoadingState />}
      {notConnected && toolkit && (
        <WidgetConnectCta
          toolkit={toolkit}
          label="Connect Google Calendar to see today's events."
        />
      )}
      {connected && isError && !notConnected && (
        <WidgetErrorState
          message={error?.message ?? "Could not load calendar"}
          onRetry={() => void refetch()}
        />
      )}
      {connected && !isLoading && !notConnected && !isError && events.length === 0 && (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-aria-text-muted">
          No events today.
        </div>
      )}
      {connected && !isLoading && !notConnected && !isError && events.length > 0 && (
        <div className="flex flex-1 flex-col gap-1 p-1.5">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex flex-col gap-0.5 rounded-[10px] border-l-2 px-2.5 py-2.5"
              style={{
                borderColor: e.color,
                background: e.soon ? "rgba(124,58,237,0.1)" : "#16161f",
              }}
            >
              <span className="font-mono text-[11px] text-aria-text-secondary">
                {e.time}
              </span>
              <span className="text-[13px] leading-tight font-medium text-aria-text">
                {e.title}
              </span>
              {e.soon && (
                <span className="text-[11px] font-semibold text-aria-primary-light">
                  starting soon
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

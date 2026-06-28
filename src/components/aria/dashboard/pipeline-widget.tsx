"use client";

import type { PipelineStage } from "@/lib/aria/types";
import { WidgetShell } from "@/components/aria/dashboard/widget-shell";
import {
  WidgetConnectCta,
  WidgetErrorState,
  WidgetLoadingState,
} from "@/components/aria/dashboard/widget-data-states";
import { useWidgetConnection } from "@/hooks/use-widget-connection";
import { useWidgetData } from "@/hooks/use-widget-data";

export function PipelineWidget() {
  const { toolkit, connected, isLoading: connLoading } =
    useWidgetConnection("pipeline");
  const { data, isLoading, error, refetch, isError } = useWidgetData<{
    stages: PipelineStage[];
  }>("pipeline", { enabled: connected });

  const stages = data?.stages ?? [];
  const dealCount = stages.reduce((n, s) => n + s.count, 0);
  const notConnected =
    (!connLoading && !connected) ||
    (isError &&
      (error as Error & { code?: string })?.code === "NOT_CONNECTED");

  return (
    <WidgetShell
      logo="H"
      logoColor="#FF7A59"
      title="Pipeline"
      span="lg:col-span-6"
      actions={
        connected && !notConnected && stages.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-aria-warning/15 px-2.5 py-1 text-xs font-semibold text-aria-warning">
            {dealCount} deals
          </span>
        ) : undefined
      }
    >
      {(connLoading || (connected && isLoading)) && <WidgetLoadingState />}
      {notConnected && toolkit && (
        <WidgetConnectCta
          toolkit={toolkit}
          label="Connect HubSpot to see your pipeline."
        />
      )}
      {connected && isError && !notConnected && (
        <WidgetErrorState
          message={error?.message ?? "Could not load pipeline"}
          onRetry={() => void refetch()}
        />
      )}
      {connected && !isLoading && !notConnected && !isError && stages.length === 0 && (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-aria-text-muted">
          No pipeline data yet.
        </div>
      )}
      {connected && !isLoading && !notConnected && !isError && stages.length > 0 && (
        <div className="grid flex-1 grid-cols-2 gap-2.5 p-4 sm:grid-cols-4">
          {stages.map((s) => (
            <div key={s.stage} className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold tracking-[0.05em] text-aria-text-secondary uppercase">
                  {s.stage}
                </span>
                <span
                  className={`font-mono text-[13px] font-bold ${s.highlight ? "text-aria-primary-light" : "text-aria-text-secondary"}`}
                >
                  {s.value}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {s.deals.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-lg border border-aria-border-subtle border-t-2 bg-[#16161f] px-2.5 py-2 text-[11px] leading-tight text-aria-text"
                    style={{ borderTopColor: d.color }}
                  >
                    {d.name}
                  </div>
                ))}
              </div>
              <span className="font-mono text-[11px] text-aria-text-muted">
                {s.count} deals
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

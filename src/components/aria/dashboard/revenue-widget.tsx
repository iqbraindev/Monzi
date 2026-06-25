"use client";

import { REVENUE_SERIES } from "@/lib/aria/mock-data";
import { WidgetShell } from "@/components/aria/dashboard/widget-shell";
import {
  WidgetConnectCta,
  WidgetErrorState,
  WidgetLoadingState,
} from "@/components/aria/dashboard/widget-data-states";
import { useWidgetData } from "@/hooks/use-widget-data";

const W = 520;
const H = 150;

function buildPaths(series: number[]) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;
  const points = series.map((v, i) => {
    const x = (i / (series.length - 1)) * W;
    const y = H - 14 - ((v - min) / range) * (H - 28);
    return { x, y };
  });

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return { line, area, last: points[points.length - 1] };
}

export function RevenueWidget() {
  const { data, isLoading, error, refetch, isError } = useWidgetData<{
    series: number[];
  }>("revenue");

  const series = data?.series?.length ? data.series : REVENUE_SERIES;
  const { line, area, last } = buildPaths(series);
  const notConnected =
    isError &&
    (error as Error & { code?: string })?.code === "NOT_CONNECTED";

  return (
    <WidgetShell
      logo="S"
      logoColor="#635BFF"
      title="Revenue"
      span="lg:col-span-6"
      actions={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-aria-success/15 px-2.5 py-1 text-xs font-semibold text-aria-success">
          Live
        </span>
      }
    >
      {isLoading && <WidgetLoadingState />}
      {notConnected && (
        <WidgetConnectCta
          toolkit="stripe"
          label="Connect Stripe to track revenue."
        />
      )}
      {isError && !notConnected && (
        <WidgetErrorState
          message={error?.message ?? "Could not load revenue"}
          onRetry={() => void refetch()}
        />
      )}
      {!isLoading && !notConnected && !isError && (
        <>
          <div className="px-4 pt-4 pb-1">
            <div className="font-heading text-3xl font-bold tracking-tight">
              Stripe
            </div>
            <div className="mt-1 text-xs text-aria-text-secondary">
              Recent balance activity
            </div>
          </div>
          <div className="min-h-[140px] flex-1 p-2 pb-3.5">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="block h-full w-full"
            >
              <defs>
                <linearGradient id="aria-rev-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="aria-rev-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#aria-rev-fill)" />
              <path
                d={line}
                fill="none"
                stroke="url(#aria-rev-line)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx={last.x} cy={last.y} r="4" fill="#06B6D4" />
            </svg>
          </div>
        </>
      )}
    </WidgetShell>
  );
}

"use client";

import Link from "next/link";

import { integrationFromToolkitSlug } from "@/lib/composio/toolkits";

export interface ConnectionHintItem {
  widgetType: string;
  widgetTitle: string;
  toolkit: string;
}

export function setDashboardConnectionHintsFlag(hints: ConnectionHintItem[]) {
  if (hints.length === 0) return;
  sessionStorage.setItem("monzi-dashboard-connection-hints", JSON.stringify(hints));
}

export function CreateDashboardConnectionHints({
  hints,
  className,
}: {
  hints: ConnectionHintItem[];
  className?: string;
}) {
  if (hints.length === 0) return null;

  const uniqueToolkits = [
    ...new Map(hints.map((h) => [h.toolkit, h])).values(),
  ];

  return (
    <div
      className={
        className ??
        "rounded-xl border border-aria-warning/30 bg-aria-warning/8 px-3.5 py-3 text-sm text-aria-text-secondary"
      }
    >
      <p className="font-medium text-aria-text">
        {hints.length === 1
          ? "1 widget needs a connection"
          : `${hints.length} widgets need connections`}
      </p>
      <p className="mt-1 text-xs leading-relaxed">
        Connect{" "}
        {uniqueToolkits
          .map((h) => integrationFromToolkitSlug(h.toolkit)?.name ?? h.toolkit)
          .join(", ")}{" "}
        in Integrations, or use the connect button inside each widget.
      </p>
      <Link
        href="/integrations"
        className="mt-2 inline-block text-xs font-semibold text-aria-primary-light hover:underline"
      >
        Go to Integrations
      </Link>
    </div>
  );
}

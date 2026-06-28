"use client";

import { Check, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToolPart = {
  type: string;
  state?: string;
  title?: string;
  errorText?: string;
  input?: Record<string, unknown>;
};

function toolLabel(part: ToolPart): string {
  if (part.title) return part.title;

  const input = part.input;
  if (part.type.includes("create_dashboard_widget") && input) {
    const widgetTitle = typeof input.title === "string" ? input.title : "widget";
    const dashName =
      typeof input.dashboard_name === "string" ? input.dashboard_name : null;
    if (dashName) return `add ${widgetTitle} to ${dashName}`;
    return `add ${widgetTitle}`;
  }

  if (part.type.includes("create_dashboard") && input?.name) {
    return `create dashboard "${String(input.name)}"`;
  }

  if (part.type.includes("create_watch") && input?.description) {
    const desc = String(input.description);
    return desc.length > 48 ? `${desc.slice(0, 45)}…` : desc;
  }

  const name = part.type.replace(/^tool-/, "").replace(/_/g, " ");
  return name || "tool";
}

export function ToolCallCard({ part }: { part: ToolPart }) {
  const label = toolLabel(part);
  const state = part.state ?? "input-available";
  const isRunning =
    state === "input-streaming" ||
    state === "input-available" ||
    state === "approval-requested";
  const isError = state === "output-error";
  const isDone = state === "output-available";

  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-col gap-1 self-start rounded-xl border px-3.5 py-2 text-xs",
        isRunning && "border-aria-accent/25 bg-aria-accent/8 text-aria-accent-light",
        isDone && "border-aria-success/25 bg-aria-success/8 text-aria-success",
        isError && "border-aria-danger/25 bg-aria-danger/8 text-aria-danger"
      )}
    >
      <span className="flex items-center gap-2.5">
        {isRunning && (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-aria-accent" />
        )}
        {isDone && <Check className="size-3.5 shrink-0" />}
        {isError && <X className="size-3.5 shrink-0" />}
        <span className="font-medium">
          {isRunning && `Using ${label}…`}
          {isDone && `Used ${label}`}
          {isError && `Failed: ${label}`}
        </span>
      </span>
      {isError && part.errorText && (
        <span className="pl-5 text-[11px] leading-snug">{part.errorText}</span>
      )}
    </div>
  );
}

export function isDashboardTool(type: string): boolean {
  return (
    type.includes("create_dashboard") ||
    type.includes("create_dashboard_widget") ||
    type.includes("list_dashboards")
  );
}

export function isIntegrationTool(type: string): boolean {
  return type.startsWith("tool-") && !isDashboardTool(type);
}

/** @deprecated use isIntegrationTool */
export function isComposioTool(type: string): boolean {
  return isIntegrationTool(type);
}

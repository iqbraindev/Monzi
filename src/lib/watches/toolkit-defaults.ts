import { WIDGET_TOOL_MAP } from "@/lib/composio/tool-map";
import { TOOLKIT_CATALOG } from "@/lib/composio/toolkits";
import type { WatchPlan } from "@/lib/watches/types";

/** Default poll tool + params per toolkit (from widget integrations). */
export const WATCH_TOOLKIT_DEFAULTS: Record<
  string,
  { poll_tool: string; poll_params: Record<string, unknown> }
> = Object.fromEntries(
  Object.values(WIDGET_TOOL_MAP).map((cfg) => [
    cfg.toolkit,
    {
      poll_tool: cfg.tool,
      poll_params: { ...(cfg.defaultParams ?? {}) },
    },
  ])
);

const KEYWORD_TOOLKIT_HINTS: Array<{ pattern: RegExp; toolkit: string }> = [
  { pattern: /\b(email|emails|inbox|mail|gmail|lead)\b/i, toolkit: "gmail" },
  { pattern: /\b(slack|channel|dm)\b/i, toolkit: "slack" },
  { pattern: /\b(calendar|meeting|event)\b/i, toolkit: "googlecalendar" },
  { pattern: /\b(deal|pipeline|hubspot|crm)\b/i, toolkit: "hubspot" },
  { pattern: /\b(notion|task|page)\b/i, toolkit: "notion" },
  { pattern: /\b(stripe|invoice|payment|revenue)\b/i, toolkit: "stripe" },
];

export function inferToolkitFromDescription(description: string): string | null {
  for (const { pattern, toolkit } of KEYWORD_TOOLKIT_HINTS) {
    if (pattern.test(description)) return toolkit;
  }
  return null;
}

export function buildPlanFromToolkit(
  description: string,
  toolkit: string
): WatchPlan | null {
  const defaults = WATCH_TOOLKIT_DEFAULTS[toolkit];
  if (!defaults) return null;

  const title =
    description.length > 80 ? `${description.slice(0, 77)}…` : description;

  return {
    title,
    condition_nl: description,
    toolkit,
    poll_tool: defaults.poll_tool,
    poll_params: defaults.poll_params,
    cursor: { type: "timestamp", value: null, field: "timestamp" },
  };
}

export function toolkitDisplayName(toolkit: string): string {
  return TOOLKIT_CATALOG[toolkit]?.name ?? toolkit;
}

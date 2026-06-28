import { generateObject } from "ai";
import { z } from "zod";

import { resolveFastChatModel } from "@/lib/ai/openrouter";
import { getLangChainTools } from "@/lib/composio/tools";
import type { ComposioScopeOptions } from "@/lib/composio/scope";
import type { WatchPlan } from "@/lib/watches/types";
import {
  buildPlanFromToolkit,
  inferToolkitFromDescription,
  toolkitDisplayName,
  WATCH_TOOLKIT_DEFAULTS,
} from "@/lib/watches/toolkit-defaults";

const toolkitPickSchema = z.object({
  title: z.string().describe("Short human-readable watch title"),
  condition_nl: z.string().describe("Full natural-language condition to evaluate"),
  toolkit: z.string().describe("Composio toolkit slug from the connected list"),
});

export interface PlanWatchInput {
  description: string;
  connectedToolkits: string[];
  workspaceId: string;
  composioScope?: ComposioScopeOptions;
}

export type PlanWatchResult =
  | { ok: true; plan: WatchPlan }
  | { ok: false; needsConnection: string; appName: string };

function planHeuristic(input: PlanWatchInput): PlanWatchResult | null {
  const connected = input.connectedToolkits.map((t) => t.toLowerCase());
  const inferred = inferToolkitFromDescription(input.description);

  if (inferred) {
    if (!connected.includes(inferred)) {
      return {
        ok: false,
        needsConnection: inferred,
        appName: toolkitDisplayName(inferred),
      };
    }
    const plan = buildPlanFromToolkit(input.description, inferred);
    if (plan) return { ok: true, plan };
  }

  if (connected.length === 1) {
    const plan = buildPlanFromToolkit(input.description, connected[0]!);
    if (plan) return { ok: true, plan };
  }

  return null;
}

async function resolvePollToolForToolkit(
  workspaceId: string,
  toolkit: string,
  composioScope?: ComposioScopeOptions
): Promise<{ poll_tool: string; poll_params: Record<string, unknown> }> {
  const defaults = WATCH_TOOLKIT_DEFAULTS[toolkit];
  if (defaults) return defaults;

  try {
    const tools = await getLangChainTools(workspaceId, [toolkit], composioScope);
    const first = tools[0]?.name;
    if (first) {
      return { poll_tool: first, poll_params: { limit: 10 } };
    }
  } catch {
    // fall through
  }

  return { poll_tool: "LIST", poll_params: { limit: 10 } };
}

export async function planWatch(input: PlanWatchInput): Promise<PlanWatchResult> {
  const heuristic = planHeuristic(input);
  if (heuristic) return heuristic;

  const connected = input.connectedToolkits.map((t) => t.toLowerCase());
  const connectedNames = connected.map(
    (slug) => `${slug} (${toolkitDisplayName(slug)})`
  );

  if (connected.length === 0) {
    const inferred = inferToolkitFromDescription(input.description) ?? "gmail";
    return {
      ok: false,
      needsConnection: inferred,
      appName: toolkitDisplayName(inferred),
    };
  }

  try {
    const model = await resolveFastChatModel();

    const { object } = await generateObject({
      model,
      schema: toolkitPickSchema,
      prompt: `Pick the best connected toolkit for this proactive watch.

User request: "${input.description}"

Connected toolkits (pick one of these slugs exactly): ${connected.join(", ")}
Names: ${connectedNames.join(", ")}

Rules:
- toolkit MUST be one of: ${connected.join(", ")}
- title: concise (under 80 chars)
- condition_nl: restate the full watch condition`,
    });

    const toolkit = object.toolkit.toLowerCase();

    if (!connected.includes(toolkit)) {
      return {
        ok: false,
        needsConnection: toolkit,
        appName: toolkitDisplayName(toolkit),
      };
    }

    const poll = await resolvePollToolForToolkit(
      input.workspaceId,
      toolkit,
      input.composioScope
    );

    return {
      ok: true,
      plan: {
        title: object.title,
        condition_nl: object.condition_nl || input.description,
        toolkit,
        poll_tool: poll.poll_tool,
        poll_params: poll.poll_params,
        cursor: { type: "timestamp", value: null, field: "timestamp" },
      },
    };
  } catch (err) {
    console.error("[planWatch]", err);

    const fallbackToolkit =
      inferToolkitFromDescription(input.description) ?? connected[0]!;

    if (!connected.includes(fallbackToolkit)) {
      return {
        ok: false,
        needsConnection: fallbackToolkit,
        appName: toolkitDisplayName(fallbackToolkit),
      };
    }

    const plan = buildPlanFromToolkit(input.description, fallbackToolkit);
    if (plan) return { ok: true, plan };

    throw err;
  }
}

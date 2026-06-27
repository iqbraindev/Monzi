import { createHash } from "crypto";

import { auth } from "@clerk/nextjs/server";

import { getWidgetToolConfig } from "@/lib/composio/tool-map";
import { executeTool, listActiveConnections } from "@/lib/composio/tools";
import {
  adaptCalendarEvents,
  adaptGmailEmails,
  adaptHubSpotPipeline,
  adaptNotionTasks,
  adaptStripeRevenue,
} from "@/lib/composio/widget-adapters";
import { getRedisOptional } from "@/lib/redis/optional";
import type { DashboardWidgetId } from "@/lib/aria/types";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    tool?: string;
    widgetId?: DashboardWidgetId;
    params?: Record<string, unknown>;
    cacheTtl?: number;
  };

  const widgetConfig = body.widgetId
    ? getWidgetToolConfig(body.widgetId)
    : undefined;

  const tool = body.tool ?? widgetConfig?.tool;
  const toolkit = widgetConfig?.toolkit;
  const params = {
    ...widgetConfig?.defaultParams,
    ...body.params,
  };

  if (!tool) {
    return Response.json({ error: "tool or widgetId is required" }, { status: 400 });
  }

  if (toolkit) {
    const connections = await listActiveConnections(userId);
    const connected = connections.some((c) => c.toolkit?.slug === toolkit);
    if (!connected) {
      return Response.json(
        { error: `${toolkit} is not connected`, code: "NOT_CONNECTED", toolkit },
        { status: 403 }
      );
    }
  }

  const cacheTtl = body.cacheTtl ?? widgetConfig?.cacheTtlSec ?? 120;
  const cacheKey = `widget:${userId}:${tool}:${hashParams(params)}`;
  const redis = getRedisOptional();

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return Response.json(JSON.parse(cached));
    }
  }

  try {
    const result = await executeTool(userId, tool, params);
    const raw = unwrapComposioResult(result);
    const payload = {
      tool,
      widgetId: body.widgetId,
      raw: result,
      data: normalizeWidgetData(body.widgetId, raw),
    };

    if (redis) {
      await redis.setex(cacheKey, cacheTtl, JSON.stringify(payload));
    }

    return Response.json(payload);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Tool execution failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

function unwrapComposioResult(result: unknown): unknown {
  if (
    result &&
    typeof result === "object" &&
    "data" in result &&
    (result as { data?: unknown }).data !== undefined
  ) {
    return (result as { data: unknown }).data;
  }
  return result;
}

function hashParams(params: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(params)).digest("hex").slice(0, 16);
}

function normalizeWidgetData(widgetId: DashboardWidgetId | undefined, raw: unknown) {
  switch (widgetId) {
    case "email":
      return { emails: adaptGmailEmails(raw) };
    case "tasks":
      return { tasks: adaptNotionTasks(raw) };
    case "calendar":
      return { events: adaptCalendarEvents(raw) };
    case "revenue":
      return { series: adaptStripeRevenue(raw) };
    case "pipeline":
      return { stages: adaptHubSpotPipeline(raw) };
    default:
      return raw;
  }
}

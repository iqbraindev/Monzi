import { tool } from "ai";
import { z } from "zod";

import { canCreateWatch } from "@/lib/billing/limit-enforcer";
import type { ComposioScopeOptions } from "@/lib/composio/scope";
import { listActiveConnections } from "@/lib/composio/tools";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkToolkitConnection } from "@/lib/watches/connection-guard";
import { planWatch } from "@/lib/watches/planner";
import {
  createWatch,
  deleteWatch,
  getWatchById,
  listWatchesForWorkspace,
  updateWatchStatus,
} from "@/lib/watches/service";

export interface WatchToolsContext {
  userId: string;
  workspaceId: string;
  ownerUserId: string;
  composioScope: ComposioScopeOptions;
  agentId: string;
}

export function getWatchTools(ctx: WatchToolsContext) {
  const supabase = getSupabaseAdmin();

  return {
    create_watch: tool({
      description:
        "Create a proactive watch that monitors a connected app and notifies the user when a condition is met. Use when the user asks to watch, monitor, keep an eye on, or get notified when something happens.",
      inputSchema: z.object({
        description: z
          .string()
          .describe(
            "Natural-language description of what to watch for, including the app/source if known"
          ),
        expires_in_days: z
          .number()
          .int()
          .min(1)
          .max(90)
          .optional()
          .describe("Optional expiry in days (default: no expiry)"),
      }),
      execute: async ({ description, expires_in_days }) => {
        try {
          const limitCheck = await canCreateWatch(
            ctx.workspaceId,
            ctx.ownerUserId
          );
          if (!limitCheck.ok) {
            return JSON.stringify({
              success: false,
              error: limitCheck.error.error,
              upgradeRequired: true,
            });
          }

          const connections = await listActiveConnections(
            ctx.workspaceId,
            ctx.composioScope
          );
          const connectedToolkits = connections
            .map((c) => c.toolkit?.slug)
            .filter((slug): slug is string => Boolean(slug));

          const planned = await planWatch({
            description,
            connectedToolkits,
            workspaceId: ctx.workspaceId,
            composioScope: ctx.composioScope,
          });

          if (!planned.ok) {
            const guard = await checkToolkitConnection(
              ctx.workspaceId,
              planned.needsConnection,
              ctx.composioScope
            );

            return JSON.stringify({
              success: false,
              needsConnection: true,
              toolkit: guard.toolkit,
              appName: guard.appName,
              connectPath: guard.connectPath,
              message: `${guard.appName} is not connected. Ask the user to connect it at ${guard.connectPath}, then run create_watch again with the same condition.`,
            });
          }

          const guard = await checkToolkitConnection(
            ctx.workspaceId,
            planned.plan.toolkit,
            ctx.composioScope
          );

          if (!guard.connected) {
            return JSON.stringify({
              success: false,
              needsConnection: true,
              toolkit: guard.toolkit,
              appName: guard.appName,
              connectPath: guard.connectPath,
              message: `${guard.appName} is not connected. Direct the user to ${guard.connectPath}.`,
            });
          }

          const watch = await createWatch(supabase, {
            workspaceId: ctx.workspaceId,
            agentId: ctx.agentId,
            createdByUserId: ctx.userId,
            plan: planned.plan,
            status: "active",
            expiresAt: expires_in_days
              ? new Date(Date.now() + expires_in_days * 86_400_000).toISOString()
              : null,
          });

          return JSON.stringify({
            success: true,
            watchId: watch.id,
            title: watch.title,
            toolkit: watch.toolkit,
            pollTool: watch.poll_tool,
            status: watch.status,
            message: `Watch active: "${watch.title}" on ${guard.appName}. You will be notified in-app when: ${watch.condition_nl}`,
          });
        } catch (err) {
          console.error("[create_watch]", err);
          const message =
            err instanceof Error ? err.message : "Failed to create watch";
          return JSON.stringify({
            success: false,
            error: message,
            message: `Could not create the watch: ${message}. Tell the user to try again or connect the required app in Integrations.`,
          });
        }
      },
    }),

    list_watches: tool({
      description: "List proactive watches for this workspace.",
      inputSchema: z.object({
        include_paused: z.boolean().optional(),
      }),
      execute: async ({ include_paused }) => {
        const statuses = include_paused
          ? (["active", "paused", "needs_connection"] as const)
          : (["active"] as const);
        const watches = await listWatchesForWorkspace(supabase, ctx.workspaceId, {
          status: [...statuses],
          agentId: ctx.agentId,
        });

        if (watches.length === 0) {
          return "No watches found for this agent.";
        }

        return JSON.stringify(
          watches.map((w) => ({
            id: w.id,
            title: w.title,
            condition: w.condition_nl,
            toolkit: w.toolkit,
            status: w.status,
            lastCheckedAt: w.last_checked_at,
            lastError: w.last_error,
          }))
        );
      },
    }),

    pause_watch: tool({
      description: "Pause an active watch so it stops checking until resumed.",
      inputSchema: z.object({
        watch_id: z.string().uuid(),
      }),
      execute: async ({ watch_id }) => {
        const watch = await getWatchById(supabase, ctx.workspaceId, watch_id);
        if (!watch) return "Watch not found.";
        await updateWatchStatus(supabase, watch_id, "paused");
        return `Paused watch "${watch.title}".`;
      },
    }),

    resume_watch: tool({
      description: "Resume a paused or needs_connection watch.",
      inputSchema: z.object({
        watch_id: z.string().uuid(),
      }),
      execute: async ({ watch_id }) => {
        const watch = await getWatchById(supabase, ctx.workspaceId, watch_id);
        if (!watch) return "Watch not found.";

        const guard = await checkToolkitConnection(
          ctx.workspaceId,
          watch.toolkit,
          ctx.composioScope
        );
        if (!guard.connected) {
          return JSON.stringify({
            success: false,
            needsConnection: true,
            connectPath: guard.connectPath,
            message: `Connect ${guard.appName} at ${guard.connectPath} before resuming.`,
          });
        }

        await updateWatchStatus(supabase, watch_id, "active");
        return `Resumed watch "${watch.title}".`;
      },
    }),

    delete_watch: tool({
      description: "Delete a watch permanently.",
      inputSchema: z.object({
        watch_id: z.string().uuid(),
      }),
      execute: async ({ watch_id }) => {
        const watch = await getWatchById(supabase, ctx.workspaceId, watch_id);
        if (!watch) return "Watch not found.";
        await deleteWatch(supabase, ctx.workspaceId, watch_id);
        return `Deleted watch "${watch.title}".`;
      },
    }),
  };
}

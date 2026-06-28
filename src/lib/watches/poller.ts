import type { SupabaseClient } from "@supabase/supabase-js";

import { executeTool } from "@/lib/composio/tools";
import { getComposioScope } from "@/lib/composio/scope";
import { broadcastNotificationCreated } from "@/lib/notifications/broadcast";
import {
  createNotification,
  isProactiveEnabled,
} from "@/lib/notifications/service";
import { normalizeWatchResult } from "@/lib/watches/adapters";
import { evaluateWatchCandidate } from "@/lib/watches/evaluator";
import {
  fetchWatchesDueForPoll,
  hasTriggerEvent,
  markWatchChecked,
  recordTriggerEvent,
} from "@/lib/watches/service";
import type { DbAgentWatch, WatchCandidate, WatchCursor } from "@/lib/watches/types";

export interface PollWatchesResult {
  processed: number;
  triggered: number;
  errors: number;
}

async function getWorkspaceScope(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ ownerUserId: string; isDefaultWorkspace: boolean } | null> {
  const { data } = await supabase
    .from("workspaces")
    .select("owner_user_id, is_default")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!data) return null;
  return {
    ownerUserId: data.owner_user_id as string,
    isDefaultWorkspace: Boolean(data.is_default),
  };
}

function isCandidateNew(
  candidate: WatchCandidate,
  cursor: WatchCursor
): boolean {
  if (!cursor.value) return true;

  if (cursor.type === "timestamp" && candidate.timestamp) {
    return new Date(candidate.timestamp).getTime() > new Date(cursor.value).getTime();
  }

  if (cursor.type === "id") {
    return candidate.id !== cursor.value;
  }

  return true;
}

function advanceCursor(
  current: WatchCursor,
  candidate: WatchCandidate
): WatchCursor {
  if (candidate.timestamp) {
    const currentMs = current.value ? new Date(current.value).getTime() : 0;
    const candidateMs = new Date(candidate.timestamp).getTime();
    if (!current.value || candidateMs > currentMs) {
      return { type: "timestamp", value: candidate.timestamp, field: current.field };
    }
  }
  if (current.type === "id") {
    return { type: "id", value: candidate.id, field: current.field };
  }
  return current;
}

export async function pollSingleWatch(
  supabase: SupabaseClient,
  watch: DbAgentWatch
): Promise<{ triggered: boolean; error?: string }> {
  const scopeRow = await getWorkspaceScope(supabase, watch.workspace_id);
  if (!scopeRow) {
    return { triggered: false, error: "Workspace not found" };
  }

  const composioScope = getComposioScope({
    ownerUserId: scopeRow.ownerUserId,
    isDefaultWorkspace: scopeRow.isDefaultWorkspace,
  });

  let triggered = false;
  let nextCursor = watch.cursor;
  let lastError: string | null = null;

  try {
    const raw = await executeTool(
      watch.workspace_id,
      watch.poll_tool,
      watch.poll_params,
      undefined,
      composioScope
    );

    const candidates = normalizeWatchResult(watch.toolkit, raw);
    const sorted = [...candidates].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return aTime - bTime;
    });

    for (const candidate of sorted) {
      if (!isCandidateNew(candidate, watch.cursor)) continue;

      const alreadyFired = await hasTriggerEvent(
        supabase,
        watch.id,
        candidate.id
      );
      if (alreadyFired) {
        nextCursor = advanceCursor(nextCursor, candidate);
        continue;
      }

      const evaluation = await evaluateWatchCandidate(
        watch.condition_nl,
        candidate
      );

      nextCursor = advanceCursor(nextCursor, candidate);

      if (!evaluation.match) continue;

      await recordTriggerEvent(supabase, {
        watchId: watch.id,
        sourceItemId: candidate.id,
        summary: evaluation.summary,
        rawSnapshot: candidate.metadata,
      });

      const proactive = await isProactiveEnabled(
        supabase,
        watch.created_by_user_id
      );

      if (proactive && watch.notify_via.includes("in_app")) {
        const notification = await createNotification(supabase, {
          workspaceId: watch.workspace_id,
          userId: watch.created_by_user_id,
          type: "watch",
          title: watch.title,
          body: evaluation.summary,
          metadata: {
            watch_id: watch.id,
            agent_id: watch.agent_id,
            reason: evaluation.reason,
            candidate_id: candidate.id,
            toolkit: watch.toolkit,
          },
        });
        await broadcastNotificationCreated(watch.workspace_id, notification);
      }

      triggered = true;
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : "Watch poll failed";
  }

  await markWatchChecked(supabase, watch.id, {
    cursor: nextCursor,
    lastError,
  });

  return { triggered, error: lastError ?? undefined };
}

export async function pollWatchesBatch(
  supabase: SupabaseClient,
  batchSize: number
): Promise<PollWatchesResult> {
  const watches = await fetchWatchesDueForPoll(supabase, batchSize);
  let triggered = 0;
  let errors = 0;

  for (const watch of watches) {
    const result = await pollSingleWatch(supabase, watch);
    if (result.triggered) triggered += 1;
    if (result.error) errors += 1;
  }

  return { processed: watches.length, triggered, errors };
}

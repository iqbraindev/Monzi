import { auth } from "@clerk/nextjs/server";

import { getComposioScope } from "@/lib/composio/scope";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  assertMemberCanMutate,
  memberAccessDeniedResponse,
} from "@/lib/rbac/member-access";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";
import { checkToolkitConnection } from "@/lib/watches/connection-guard";
import {
  deleteWatch,
  getWatchById,
  updateWatchStatus,
} from "@/lib/watches/service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ctx = await resolveWorkspaceContext(userId, { request: req });

    try {
      assertMemberCanMutate(ctx);
    } catch (err) {
      return memberAccessDeniedResponse(err);
    }

    const body = (await req.json()) as { status?: "active" | "paused" };
    if (!body.status || !["active", "paused"].includes(body.status)) {
      return Response.json({ error: "status must be active or paused" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const watch = await getWatchById(supabase, ctx.workspaceId, id);
    if (!watch) {
      return Response.json({ error: "Watch not found" }, { status: 404 });
    }

    if (body.status === "active") {
      const guard = await checkToolkitConnection(
        ctx.workspaceId,
        watch.toolkit,
        getComposioScope(ctx)
      );
      if (!guard.connected) {
        return Response.json(
          {
            error: `${guard.appName} is not connected`,
            connectPath: guard.connectPath,
          },
          { status: 409 }
        );
      }
    }

    await updateWatchStatus(supabase, id, body.status);
    return Response.json({ ok: true, status: body.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update watch";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ctx = await resolveWorkspaceContext(userId, { request: req });

    try {
      assertMemberCanMutate(ctx);
    } catch (err) {
      return memberAccessDeniedResponse(err);
    }

    const supabase = getSupabaseAdmin();
    const deleted = await deleteWatch(supabase, ctx.workspaceId, id);
    if (!deleted) {
      return Response.json({ error: "Watch not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete watch";
    return Response.json({ error: message }, { status: 500 });
  }
}

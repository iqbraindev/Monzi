import { auth } from "@clerk/nextjs/server";

import { canCreateWatch } from "@/lib/billing/limit-enforcer";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";
import {
  assertMemberCanMutate,
  memberAccessDeniedResponse,
} from "@/lib/rbac/member-access";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";
import { listWatchesForWorkspace } from "@/lib/watches/service";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseUser(userId);
    const ctx = await resolveWorkspaceContext(userId, { request: req });
    const supabase = getSupabaseAdmin();
    const watches = await listWatchesForWorkspace(supabase, ctx.workspaceId);
    return Response.json({ watches });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list watches";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseUser(userId);
    const ctx = await resolveWorkspaceContext(userId, { request: req });

    try {
      assertMemberCanMutate(ctx);
    } catch (err) {
      return memberAccessDeniedResponse(err);
    }

    const limitCheck = await canCreateWatch(ctx.workspaceId, ctx.ownerUserId);
    if (!limitCheck.ok) {
      return Response.json(limitCheck.error, { status: 403 });
    }

    const body = (await req.json()) as {
      agentId?: string;
      description?: string;
    };

    if (!body.agentId || !body.description?.trim()) {
      return Response.json(
        { error: "agentId and description are required" },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error:
          "Create watches via agent chat using the create_watch tool, or use this endpoint with a planned watch payload in a future version.",
      },
      { status: 501 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create watch";
    return Response.json({ error: message }, { status: 500 });
  }
}

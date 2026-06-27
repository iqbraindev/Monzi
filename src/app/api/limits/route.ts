import { auth } from "@clerk/nextjs/server";

import { getWorkspaceLimitsSnapshot } from "@/lib/billing/limit-enforcer";
import { getComposioScope } from "@/lib/composio/scope";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";
import { ensureSupabaseUser } from "@/lib/users/provision";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseUser(userId);
    const ctx = await resolveWorkspaceContext(userId, { request: req });
    const snapshot = await getWorkspaceLimitsSnapshot(
      ctx.workspaceId,
      ctx.ownerUserId,
      getComposioScope(ctx)
    );

    return Response.json({
      workspaceId: ctx.workspaceId,
      ownerUserId: ctx.ownerUserId,
      memberRole: ctx.memberRole,
      ...snapshot,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load limits";
    return Response.json({ error: message }, { status: 500 });
  }
}

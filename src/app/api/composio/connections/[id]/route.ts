import { auth } from "@clerk/nextjs/server";

import { removeToolkitFromAgents } from "@/lib/composio/agent-toolkits";
import { getComposioScope } from "@/lib/composio/scope";
import {
  deleteConnectionForWorkspace,
  listActiveConnections,
} from "@/lib/composio/tools";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(userId, { request: req });
  const composioScope = getComposioScope(ctx);
  const { id } = await params;

  try {
    const connections = await listActiveConnections(
      ctx.workspaceId,
      composioScope
    );
    const account = connections.find((item) => item.id === id);

    if (!account) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const toolkitSlug = account.toolkit?.slug;
    await deleteConnectionForWorkspace(ctx.workspaceId, id, composioScope);

    if (toolkitSlug) {
      await removeToolkitFromAgents(ctx.workspaceId, toolkitSlug);
    }

    return Response.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to disconnect";
    const status = message === "Connection not found" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}

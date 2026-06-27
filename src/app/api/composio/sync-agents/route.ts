import { auth } from "@clerk/nextjs/server";

import { assignToolkitToAgents } from "@/lib/composio/agent-toolkits";
import { getComposioScope } from "@/lib/composio/scope";
import { listActiveConnections } from "@/lib/composio/tools";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(userId, { request: req });
  const composioScope = getComposioScope(ctx);

  const body = (await req.json()) as {
    toolkit?: string;
    agentIds?: string[];
    syncAll?: boolean;
  };

  try {
    if (body.syncAll) {
      const connections = await listActiveConnections(
        ctx.workspaceId,
        composioScope
      );
      const toolkits = [
        ...new Set(
          connections
            .map((c) => c.toolkit?.slug)
            .filter((slug): slug is string => Boolean(slug))
        ),
      ];

      for (const toolkit of toolkits) {
        await assignToolkitToAgents(ctx.workspaceId, toolkit, body.agentIds);
      }

      return Response.json({ synced: toolkits });
    }

    const toolkit = body.toolkit?.trim().toLowerCase();
    if (!toolkit) {
      return Response.json({ error: "toolkit is required" }, { status: 400 });
    }

    await assignToolkitToAgents(ctx.workspaceId, toolkit, body.agentIds);
    return Response.json({ synced: [toolkit] });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to sync integrations";
    return Response.json({ error: message }, { status: 500 });
  }
}

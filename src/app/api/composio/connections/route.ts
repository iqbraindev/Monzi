import { auth } from "@clerk/nextjs/server";

import { getComposioScope } from "@/lib/composio/scope";
import { listActiveConnections } from "@/lib/composio/tools";
import { integrationNameFromToolkit } from "@/lib/composio/toolkits";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";
import { resumeWatchesNeedingConnection } from "@/lib/watches/service";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ctx = await resolveWorkspaceContext(userId, { request: req });
    const composioScope = getComposioScope(ctx);
    const accounts = await listActiveConnections(ctx.workspaceId, composioScope);
    const connections = accounts.map((account) => ({
      id: account.id,
      toolkit: account.toolkit?.slug ?? "",
      name: integrationNameFromToolkit(account.toolkit?.slug ?? ""),
      status: account.status,
    }));

    const supabase = getSupabaseAdmin();
    for (const conn of connections) {
      if (conn.toolkit) {
        await resumeWatchesNeedingConnection(
          supabase,
          ctx.workspaceId,
          conn.toolkit
        );
      }
    }

    return Response.json({ connections });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list connections";
    return Response.json({ error: message }, { status: 500 });
  }
}

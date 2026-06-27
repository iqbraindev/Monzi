import { auth } from "@clerk/nextjs/server";

import { dbAgentToUiAgent } from "@/lib/agents/adapter";
import { getUserVoiceEnabled } from "@/lib/billing/limits";
import { listActiveConnections } from "@/lib/composio/tools";
import { getComposioScope } from "@/lib/composio/scope";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);
    const ctx = await resolveWorkspaceContext(userId, { request: req });

    const supabase = getSupabaseAdmin();
    const { data: agentRow } = await supabase
      .from("agents")
      .select("*")
      .eq("workspace_id", ctx.workspaceId)
      .eq("is_default", true)
      .maybeSingle();

    if (!agentRow) {
      return Response.json({ error: "No default agent" }, { status: 404 });
    }

    const connections = await listActiveConnections(
      ctx.workspaceId,
      getComposioScope(ctx)
    );
    const extraToolkits = connections
      .map((c) => c.toolkit?.slug)
      .filter((slug): slug is string => Boolean(slug));

    const voiceAllowed = await getUserVoiceEnabled(ctx.ownerUserId);
    const agent = dbAgentToUiAgent(agentRow, 0, extraToolkits, voiceAllowed);

    return Response.json({ agentId: agentRow.id, agent });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load default agent";
    console.error("[agents/default]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

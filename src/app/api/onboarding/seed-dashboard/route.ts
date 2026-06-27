import { auth } from "@clerk/nextjs/server";

import { seedDashboardFromToolkits } from "@/lib/onboarding/seed-dashboard";
import { updateOnboardingProgress } from "@/lib/onboarding/service";
import { getConnectedToolkitSlugs } from "@/lib/composio/agent-toolkits";
import { getComposioScope } from "@/lib/composio/scope";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseUser(userId);
    const ctx = await resolveWorkspaceContext(userId, { request: req });
    const composioScope = getComposioScope(ctx);
    const supabase = getSupabaseAdmin();

    let body: { agentId?: string; toolkits?: string[] } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine
    }

    let connectedToolkits = body.toolkits ?? [];

    if (body.agentId) {
      const { data: agent } = await supabase
        .from("agents")
        .select("tools")
        .eq("id", body.agentId)
        .eq("workspace_id", ctx.workspaceId)
        .maybeSingle();

      const apps = (agent?.tools as { composio_apps?: string[] } | null)
        ?.composio_apps;
      if (apps?.length) {
        connectedToolkits = [...connectedToolkits, ...apps];
      }
    }

    if (connectedToolkits.length === 0) {
      connectedToolkits = await getConnectedToolkitSlugs(
        ctx.workspaceId,
        composioScope
      );
    }

    const result = await seedDashboardFromToolkits({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      ownerUserId: ctx.ownerUserId,
      connectedToolkits,
      composioScope,
      supabase,
    });

    await updateOnboardingProgress(userId, {
      step: "dashboard",
      dashboardId: result.dashboardId,
    });

    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to seed dashboard";
    console.error("[onboarding/seed-dashboard]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

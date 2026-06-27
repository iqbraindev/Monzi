import { auth } from "@clerk/nextjs/server";

import { canCreateWidget } from "@/lib/billing/limit-enforcer";
import { createWidget } from "@/lib/dashboard/service";
import { getComposioScope } from "@/lib/composio/scope";
import { getRegistryEntry } from "@/lib/dashboard/widget-registry";
import { broadcastWidgetCreated } from "@/lib/dashboard/broadcast";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);
    const ctx = await resolveWorkspaceContext(userId, { request: req });

    const { id: dashboardId } = await params;
    const body = (await req.json()) as { type?: string; title?: string };

    if (!body.type) {
      return Response.json({ error: "type is required" }, { status: 400 });
    }

    const reg = getRegistryEntry(body.type);
    if (!reg) {
      return Response.json({ error: "Unknown widget type" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: dashboard } = await supabase
      .from("dashboards")
      .select("id")
      .eq("id", dashboardId)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();

    if (!dashboard) {
      return Response.json({ error: "Dashboard not found" }, { status: 404 });
    }

    const widgetCheck = await canCreateWidget(
      ctx.workspaceId,
      ctx.ownerUserId,
      dashboardId
    );
    if (!widgetCheck.ok) {
      return Response.json(widgetCheck.error, { status: 403 });
    }

    const widget = await createWidget(supabase, {
      workspaceId: ctx.workspaceId,
      dashboardId,
      type: body.type,
      title: body.title ?? reg.defaultTitle,
      composioScope: getComposioScope(ctx),
      createdBy: "user",
    });

    await broadcastWidgetCreated(ctx.workspaceId, dashboardId, widget);

    return Response.json({ widget });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to add widget";
    console.error("[dashboard widgets POST]", err);
    const status = message.includes("requires connecting") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}

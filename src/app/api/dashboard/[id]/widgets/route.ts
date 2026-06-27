import { auth } from "@clerk/nextjs/server";

import { createWidget } from "@/lib/dashboard/service";
import { getRegistryEntry } from "@/lib/dashboard/widget-registry";
import { broadcastWidgetCreated } from "@/lib/dashboard/broadcast";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";

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
      .eq("user_id", userId)
      .maybeSingle();

    if (!dashboard) {
      return Response.json({ error: "Dashboard not found" }, { status: 404 });
    }

    const widget = await createWidget(supabase, {
      userId,
      dashboardId,
      type: body.type,
      title: body.title ?? reg.defaultTitle,
      createdBy: "user",
    });

    await broadcastWidgetCreated(userId, dashboardId, widget);

    return Response.json({ widget });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to add widget";
    console.error("[dashboard widgets POST]", err);
    const status = message.includes("requires connecting") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}

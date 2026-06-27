import { auth } from "@clerk/nextjs/server";

import {
  deleteDashboard,
  updateDashboard,
} from "@/lib/dashboard/service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";

export async function PATCH(
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
    const body = (await req.json()) as {
      name?: string;
      icon?: string;
      description?: string;
    };

    const supabase = getSupabaseAdmin();
    const dashboard = await updateDashboard(supabase, {
      userId,
      dashboardId,
      name: body.name?.trim() || undefined,
      icon: body.icon,
      description: body.description,
    });

    return Response.json({ dashboard });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update dashboard";
    console.error("[dashboard PATCH]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);

    const { id: dashboardId } = await params;
    const supabase = getSupabaseAdmin();
    await deleteDashboard(supabase, userId, dashboardId);

    return Response.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete dashboard";
    console.error("[dashboard DELETE]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

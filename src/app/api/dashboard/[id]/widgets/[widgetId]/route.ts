import { auth } from "@clerk/nextjs/server";

import { deleteWidget } from "@/lib/dashboard/service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; widgetId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);

    const { id: dashboardId, widgetId } = await params;
    const supabase = getSupabaseAdmin();
    await deleteWidget(supabase, userId, dashboardId, widgetId);

    return Response.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete widget";
    console.error("[dashboard widget DELETE]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

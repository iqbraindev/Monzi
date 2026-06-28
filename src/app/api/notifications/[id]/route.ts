import { auth } from "@clerk/nextjs/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { markNotificationRead } from "@/lib/notifications/service";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ctx = await resolveWorkspaceContext(userId, { request: req });
    const supabase = getSupabaseAdmin();
    const updated = await markNotificationRead(
      supabase,
      ctx.workspaceId,
      userId,
      id
    );

    if (!updated) {
      return Response.json({ error: "Notification not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark notification read";
    return Response.json({ error: message }, { status: 500 });
  }
}

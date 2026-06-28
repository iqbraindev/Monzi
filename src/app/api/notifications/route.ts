import { auth } from "@clerk/nextjs/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
} from "@/lib/notifications/service";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseUser(userId);
    const ctx = await resolveWorkspaceContext(userId, { request: req });
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "1";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

    const supabase = getSupabaseAdmin();
    const [notifications, unreadCount] = await Promise.all([
      listNotifications(supabase, ctx.workspaceId, userId, {
        unreadOnly,
        limit,
      }),
      countUnreadNotifications(supabase, ctx.workspaceId, userId),
    ]);

    return Response.json({ notifications, unreadCount });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load notifications";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ctx = await resolveWorkspaceContext(userId, { request: req });
    const body = (await req.json()) as { action?: string };
    if (body.action !== "read_all") {
      return Response.json({ error: "Unsupported action" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const count = await markAllNotificationsRead(
      supabase,
      ctx.workspaceId,
      userId
    );
    return Response.json({ ok: true, marked: count });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update notifications";
    return Response.json({ error: message }, { status: 500 });
  }
}

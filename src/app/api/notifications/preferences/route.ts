import { auth } from "@clerk/nextjs/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/notifications/service";
import { ensureSupabaseUser } from "@/lib/users/provision";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseUser(userId);
    const supabase = getSupabaseAdmin();
    const preferences = await getNotificationPreferences(supabase, userId);
    return Response.json({ preferences });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load preferences";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseUser(userId);
    const body = (await req.json()) as {
      email?: boolean;
      push?: boolean;
      proactive?: boolean;
    };

    const supabase = getSupabaseAdmin();
    const preferences = await upsertNotificationPreferences(supabase, userId, body);
    return Response.json({ preferences });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save preferences";
    return Response.json({ error: message }, { status: 500 });
  }
}

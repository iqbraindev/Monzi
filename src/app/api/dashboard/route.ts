import { auth } from "@clerk/nextjs/server";

import {
  listDashboards,
  seedDefaultDashboardIfEmpty,
} from "@/lib/dashboard/service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);

    const supabase = getSupabaseAdmin();
    await seedDefaultDashboardIfEmpty(supabase, userId);
    const dashboards = await listDashboards(supabase, userId);

    return Response.json({ dashboards });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load dashboards";
    console.error("[dashboard GET]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

import { auth } from "@clerk/nextjs/server";

import { getBillingOverview } from "@/lib/billing/subscription";
import { ensureSupabaseUser } from "@/lib/users/provision";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);
    const overview = await getBillingOverview(userId);
    return Response.json(overview);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load billing";
    return Response.json({ error: message }, { status: 500 });
  }
}

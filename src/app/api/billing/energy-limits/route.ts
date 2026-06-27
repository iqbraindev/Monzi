import { auth } from "@clerk/nextjs/server";

import { getPlanEnergyLimits } from "@/lib/billing/energy";
import { ensureSupabaseUser } from "@/lib/users/provision";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);

    const limits = await getPlanEnergyLimits(userId);
    return Response.json(limits);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load energy limits";
    return Response.json({ error: message }, { status: 500 });
  }
}

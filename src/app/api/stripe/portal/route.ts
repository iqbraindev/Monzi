import { auth } from "@clerk/nextjs/server";

import { getStripeCustomerId } from "@/lib/billing/subscription";
import { getStripe } from "@/lib/stripe/client";
import { ensureSupabaseUser } from "@/lib/users/provision";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);
    const customerId = await getStripeCustomerId(userId);

    if (!customerId) {
      return Response.json(
        { error: "No billing account found" },
        { status: 400 }
      );
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/billing`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to open billing portal";
    return Response.json({ error: message }, { status: 500 });
  }
}

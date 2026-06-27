import { auth } from "@clerk/nextjs/server";

import { getStripeCustomerId } from "@/lib/billing/subscription";
import { getStripePriceId } from "@/lib/stripe/products";
import { getStripe } from "@/lib/stripe/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { plan?: string; cycle?: string };
    const plan = body.plan;
    const cycle = body.cycle === "yearly" ? "yearly" : "monthly";

    if (!plan || plan === "free") {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }

    await ensureSupabaseUser(userId);

    const priceId = await getStripePriceId(plan, cycle);
    if (!priceId) {
      return Response.json(
        { error: "Plan is not configured for checkout" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, pack:packs(slug)")
      .eq("user_id", userId)
      .single();

    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const stripe = await getStripe();
      const customer = await stripe.customers.create({
        metadata: { clerk_id: userId },
      });
      customerId = customer.id;
      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", userId);
    }

    const packRow = Array.isArray(sub?.pack) ? sub.pack[0] : sub?.pack;
    const currentSlug = (packRow as { slug?: string } | null)?.slug ?? "free";

    if (sub?.stripe_subscription_id && currentSlug !== "free") {
      const stripe = await getStripe();
      const stripeSub = await stripe.subscriptions.retrieve(
        sub.stripe_subscription_id
      );
      const itemId = stripeSub.items.data[0]?.id;
      if (!itemId) {
        return Response.json(
          { error: "Subscription item not found" },
          { status: 400 }
        );
      }

      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "create_prorations",
        metadata: { userId, plan, cycle },
      });

      const updatedSub = await stripe.subscriptions.retrieve(
        sub.stripe_subscription_id
      );
      const { handleSubscriptionUpdated } = await import(
        "@/lib/stripe/webhook-handlers"
      );
      await handleSubscriptionUpdated(updatedSub);

      return Response.json({ updated: true, url: `${APP_URL}/billing?success=true` });
    }

    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/billing?success=true`,
      cancel_url: `${APP_URL}/billing`,
      metadata: { userId, plan, cycle },
      subscription_data: {
        metadata: { userId, plan, cycle },
      },
    });

    return Response.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to start checkout";
    return Response.json({ error: message }, { status: 500 });
  }
}

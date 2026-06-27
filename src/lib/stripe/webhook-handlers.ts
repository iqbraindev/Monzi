import type Stripe from "stripe";

import { updateUserPlan } from "@/lib/clerk/metadata";
import { resetMonthlyUsage } from "@/lib/billing/usage";
import {
  getInvoiceSubscriptionId,
  getSubscriptionPeriod,
} from "@/lib/stripe/helpers";
import { getPlanSlugFromPriceId } from "@/lib/stripe/products";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function getPackIdBySlug(slug: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("packs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}

async function syncSubscriptionFromStripe(
  stripeSub: Stripe.Subscription,
  userId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const priceId = stripeSub.items.data[0]?.price.id;
  const planSlug =
    (stripeSub.metadata?.plan as string | undefined) ??
    (priceId ? await getPlanSlugFromPriceId(priceId) : null) ??
    "free";

  const packId = await getPackIdBySlug(planSlug);
  const cycle =
    stripeSub.items.data[0]?.price.recurring?.interval === "year"
      ? "yearly"
      : "monthly";

  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    paused: "paused",
  };

  const status = statusMap[stripeSub.status] ?? "active";
  const period = getSubscriptionPeriod(stripeSub);

  await supabase
    .from("subscriptions")
    .update({
      pack_id: packId,
      status,
      billing_cycle: cycle,
      stripe_subscription_id: stripeSub.id,
      current_period_start: new Date(period.start * 1000).toISOString(),
      current_period_end: new Date(period.end * 1000).toISOString(),
      trial_ends_at: stripeSub.trial_end
        ? new Date(stripeSub.trial_end * 1000).toISOString()
        : null,
      canceled_at: stripeSub.canceled_at
        ? new Date(stripeSub.canceled_at * 1000).toISOString()
        : null,
    })
    .eq("user_id", userId);

  await updateUserPlan(userId, planSlug, status === "past_due" ? "past_due" : "active");
}

async function resolveUserIdFromSubscription(
  stripeSub: Stripe.Subscription
): Promise<string | null> {
  if (stripeSub.metadata?.userId) return stripeSub.metadata.userId;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSub.id)
    .maybeSingle();

  return data?.user_id ?? null;
}

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId;
  const subscriptionId = session.subscription;

  if (!userId || !subscriptionId || typeof subscriptionId !== "string") return;

  const { getStripe } = await import("@/lib/stripe/client");
  const stripeSub = await getStripe().subscriptions.retrieve(subscriptionId);
  await syncSubscriptionFromStripe(stripeSub, userId);
}

export async function handleInvoicePaid(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const supabase = getSupabaseAdmin();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!sub?.user_id) return;

  await resetMonthlyUsage(sub.user_id);

  const { getStripe } = await import("@/lib/stripe/client");
  const stripeSub = await getStripe().subscriptions.retrieve(subscriptionId);
  const period = getSubscriptionPeriod(stripeSub);

  await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: new Date(period.start * 1000).toISOString(),
      current_period_end: new Date(period.end * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  const priceId = stripeSub.items.data[0]?.price.id;
  const planSlug =
    (stripeSub.metadata?.plan as string | undefined) ??
    (priceId ? await getPlanSlugFromPriceId(priceId) : null) ??
    "free";

  await updateUserPlan(sub.user_id, planSlug, "active");
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const supabase = getSupabaseAdmin();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id, pack:packs(slug)")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!sub?.user_id) return;

  await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);

  const packRow = Array.isArray(sub.pack) ? sub.pack[0] : sub.pack;
  const planSlug = (packRow as { slug?: string } | null)?.slug ?? "free";
  await updateUserPlan(sub.user_id, planSlug, "past_due");
}

export async function handleSubscriptionDeleted(
  stripeSub: Stripe.Subscription
): Promise<void> {
  const userId = await resolveUserIdFromSubscription(stripeSub);
  if (!userId) return;

  const freePackId = await getPackIdBySlug("free");
  const supabase = getSupabaseAdmin();

  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      pack_id: freePackId,
      stripe_subscription_id: null,
      canceled_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  await updateUserPlan(userId, "free", "active");
}

export async function handleSubscriptionUpdated(
  stripeSub: Stripe.Subscription
): Promise<void> {
  const userId = await resolveUserIdFromSubscription(stripeSub);
  if (!userId) return;
  await syncSubscriptionFromStripe(stripeSub, userId);
}

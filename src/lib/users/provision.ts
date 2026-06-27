import { clerkClient } from "@clerk/nextjs/server";

import { getStripe } from "@/lib/stripe/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Ensures a Clerk user has a matching row in Supabase (and default resources).
 * Covers dev/local sign-up when the Clerk webhook did not run.
 */
export async function ensureSupabaseUser(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return;

  await provisionSupabaseUser(userId);
}

async function provisionSupabaseUser(userId: string): Promise<void> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("No email found for user");
  }

  const isSuperAdmin = email === process.env.SUPER_ADMIN_EMAIL;
  const role = isSuperAdmin ? "super_admin" : "user";
  const supabase = getSupabaseAdmin();

  const { error: userError } = await supabase.from("users").insert({
    id: userId,
    email,
    full_name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
    avatar_url: user.imageUrl,
    role,
  });

  if (userError && userError.code !== "23505") {
    throw new Error(userError.message);
  }

  let stripeCustomerId: string | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const customer = await getStripe().customers.create({
        email,
        metadata: { clerk_id: userId },
      });
      stripeCustomerId = customer.id;
    } catch {
      // Stripe is optional in local/dev.
    }
  }

  const { data: freePack } = await supabase
    .from("packs")
    .select("id")
    .eq("slug", "free")
    .single();

  if (freePack) {
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingSub) {
      await supabase.from("subscriptions").insert({
        user_id: userId,
        pack_id: freePack.id,
        status: "active",
        stripe_customer_id: stripeCustomerId,
      });
    }
  }

  const metadata = user.publicMetadata ?? {};
  if (!metadata.plan) {
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role,
        plan: "free",
        plan_status: "active",
        onboarding_completed: false,
      },
      privateMetadata: stripeCustomerId
        ? { stripe_customer_id: stripeCustomerId }
        : {},
    });
  }

  const { data: existingAgent } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (!existingAgent) {
    await supabase.from("agents").insert({
      user_id: userId,
      name: "Monzi",
      slug: "aria",
      role: "general_assistant",
      is_default: true,
    });
  }
}

import { clerkClient } from "@clerk/nextjs/server";

import { resolveSuperAdminRole } from "@/lib/auth/super-admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  createWorkspaceForOwner,
  ensureDefaultWorkspace,
} from "@/lib/workspaces/service";

/**
 * Keeps Supabase + Clerk role in sync with SUPER_ADMIN_EMAIL.
 * Changing .env alone does not update existing accounts without this.
 */
export async function syncSuperAdminRole(userId: string): Promise<boolean> {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim();
  if (!superAdminEmail) return false;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return false;

  const targetRole = resolveSuperAdminRole(email);
  const currentClerkRole = (user.publicMetadata?.role as string | undefined) ?? "user";

  const supabase = getSupabaseAdmin();
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const currentDbRole = dbUser?.role ?? "user";
  const needsClerkUpdate = currentClerkRole !== targetRole;
  const needsDbUpdate = dbUser != null && currentDbRole !== targetRole;

  if (!needsClerkUpdate && !needsDbUpdate) return false;

  if (needsDbUpdate) {
    await supabase.from("users").update({ role: targetRole }).eq("id", userId);
  }

  if (needsClerkUpdate) {
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        role: targetRole,
      },
    });
  }

  return true;
}

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

  if (existing) {
    await syncSuperAdminRole(userId);
    await ensureDefaultWorkspace(userId);
    return;
  }

  await provisionSupabaseUser(userId);
}

/**
 * If this email was invited before signup, attach pending workspace access to the real Clerk user.
 */
async function claimPendingInvite(
  userId: string,
  email: string,
  user: Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>>
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data: pendingInvite } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .like("id", "invite_%")
    .maybeSingle();

  if (!pendingInvite) return false;

  const inviteId = pendingInvite.id;

  await supabase
    .from("workspace_members")
    .update({ user_id: userId })
    .eq("user_id", inviteId);

  await supabase
    .from("subaccount_permissions")
    .update({ subaccount_id: userId })
    .eq("subaccount_id", inviteId);

  await supabase.from("users").delete().eq("id", inviteId);

  const { error: userError } = await supabase.from("users").insert({
    id: userId,
    email,
    full_name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
    avatar_url: user.imageUrl,
    role: "subaccount",
    is_active: true,
  });

  if (userError && userError.code !== "23505") {
    throw new Error(userError.message);
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...(user.publicMetadata ?? {}),
      role: "subaccount",
      onboarding_completed: true,
    },
  });

  return true;
}

async function provisionSupabaseUser(userId: string): Promise<void> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("No email found for user");
  }

  const claimedInvite = await claimPendingInvite(userId, email, user);
  if (claimedInvite) {
    return;
  }

  const role = resolveSuperAdminRole(email);
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
  if (await isStripeConfigured()) {
    try {
      const customer = await (await getStripe()).customers.create({
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

  await createWorkspaceForOwner(userId, "My Workspace", {
    isDefault: true,
    skipResourceBootstrap: true,
  });
}

export { ensureDefaultWorkspace, createWorkspaceForOwner };

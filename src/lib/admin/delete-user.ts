import { clerkClient } from "@clerk/nextjs/server";

import { logAuditEvent } from "@/lib/billing/audit";
import { getComposio } from "@/lib/composio/client";
import {
  getComposioEntityId,
  getLegacyComposioEntityId,
} from "@/lib/composio/entity-id";
import { getRedisOptional } from "@/lib/redis/optional";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { deleteWorkspaceLogo } from "@/lib/workspaces/logo-storage";

type UserRow = {
  id: string;
  email: string;
  role: string;
  is_suspended: boolean;
};

async function loadUser(userId: string): Promise<UserRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, role, is_suspended")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as UserRow | null;
}

async function listSubaccountIds(parentUserId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("parent_user_id", parentUserId)
    .eq("role", "subaccount");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id);
}

async function clearNonCascadingReferences(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase.from("audit_log").update({ actor_id: null }).eq("actor_id", userId);

  await supabase
    .from("platform_settings")
    .update({ updated_by: null })
    .eq("updated_by", userId);

  await supabase
    .from("platform_secrets")
    .update({ updated_by: null })
    .eq("updated_by", userId);
}

async function cleanupStripe(userId: string): Promise<void> {
  if (!(await isStripeConfigured())) return;

  const supabase = getSupabaseAdmin();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!subscription) return;

  const stripe = await getStripe();

  if (subscription.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
    } catch {
      // subscription may already be canceled
    }
  }

  if (subscription.stripe_customer_id) {
    try {
      await stripe.customers.del(subscription.stripe_customer_id);
    } catch {
      // customer may already be removed
    }
  }
}

async function cleanupComposio(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id, is_default")
    .eq("owner_user_id", userId);

  if (error) throw new Error(error.message);
  if (!workspaces?.length) return;

  const composio = await getComposio();

  for (const workspace of workspaces) {
    const entityIds = [getComposioEntityId(workspace.id)];
    if (workspace.is_default) {
      entityIds.push(getLegacyComposioEntityId(userId));
    }

    const response = await composio.connectedAccounts.list({
      userIds: entityIds,
    });

    for (const connection of response.items) {
      try {
        await composio.connectedAccounts.delete(connection.id);
      } catch {
        // best effort — account may already be removed
      }
    }
  }
}

async function cleanupWorkspaceLogos(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", userId);

  if (error) throw new Error(error.message);

  await Promise.all(
    (workspaces ?? []).map((workspace) => deleteWorkspaceLogo(workspace.id))
  );
}

async function cleanupRedis(userId: string): Promise<void> {
  const redis = getRedisOptional();
  if (!redis) return;
  try {
    await redis.del(`limits:${userId}`);
  } catch {
    // optional cache
  }
}

async function deleteClerkUser(userId: string): Promise<void> {
  const client = await clerkClient();
  try {
    await client.users.deleteUser(userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clerk delete failed";
    if (!message.toLowerCase().includes("not found")) {
      throw new Error(message);
    }
  }
}

async function deleteSupabaseUser(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) throw new Error(error.message);
}

async function purgeUserData(
  userId: string,
  options?: { skipExternalCleanup?: boolean }
): Promise<void> {
  if (!options?.skipExternalCleanup) {
    await Promise.all([
      cleanupStripe(userId),
      cleanupComposio(userId),
      cleanupWorkspaceLogos(userId),
      cleanupRedis(userId),
    ]);
  }

  await clearNonCascadingReferences(userId);
  await deleteClerkUser(userId);
  await deleteSupabaseUser(userId);
}

/**
 * Permanently delete a suspended user and all related data.
 * Parent accounts delete their subaccounts first.
 */
export async function deleteAdminUser(
  adminId: string,
  userId: string
): Promise<{ email: string }> {
  if (adminId === userId) {
    throw new Error("You cannot delete your own account");
  }

  const user = await loadUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.role === "super_admin") {
    throw new Error("Super admin accounts cannot be deleted");
  }

  if (!user.is_suspended) {
    throw new Error("Only suspended users can be deleted");
  }

  if (user.role === "user") {
    const subaccountIds = await listSubaccountIds(userId);
    for (const subaccountId of subaccountIds) {
      await purgeUserData(subaccountId, { skipExternalCleanup: true });
    }
  }

  await logAuditEvent({
    actorId: adminId,
    action: "user.delete",
    targetType: "user",
    targetId: userId,
    metadata: { email: user.email, role: user.role },
  });

  await purgeUserData(userId);

  return { email: user.email };
}

import { clerkClient, WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

import { getPlatformSecret } from "@/lib/platform/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { createWorkspaceForOwner } from "@/lib/workspaces/service";

export async function POST(req: Request) {
  const payload = await req.text();
  const headerPayload = await headers();
  const svixHeaders = {
    "svix-id": headerPayload.get("svix-id")!,
    "svix-timestamp": headerPayload.get("svix-timestamp")!,
    "svix-signature": headerPayload.get("svix-signature")!,
  };

  const webhookSecret = await getPlatformSecret("clerk.webhook_secret");
  if (!webhookSecret) {
    return Response.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const wh = new Webhook(webhookSecret);
  let event: WebhookEvent;

  try {
    event = wh.verify(payload, svixHeaders) as WebhookEvent;
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "user.created": {
      const { id, email_addresses, first_name, last_name, image_url } =
        event.data;
      const email = email_addresses[0]?.email_address;
      if (!email) {
        return Response.json({ error: "No email found" }, { status: 400 });
      }

      const isSuperAdmin =
        email.trim().toLowerCase() ===
        process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
      const role = isSuperAdmin ? "super_admin" : "user";

      const supabase = getSupabaseAdmin();

      await supabase.from("users").insert({
        id,
        email,
        full_name: `${first_name ?? ""} ${last_name ?? ""}`.trim(),
        avatar_url: image_url,
        role,
      });

      let stripeCustomerId: string | null = null;
      if (await isStripeConfigured()) {
        const customer = await (await getStripe()).customers.create({
          email,
          metadata: { clerk_id: id },
        });
        stripeCustomerId = customer.id;
      }

      const { data: freePack } = await supabase
        .from("packs")
        .select("id")
        .eq("slug", "free")
        .single();

      if (freePack) {
        await supabase.from("subscriptions").insert({
          user_id: id,
          pack_id: freePack.id,
          status: "active",
          stripe_customer_id: stripeCustomerId,
        });
      }

      const client = await clerkClient();
      await client.users.updateUserMetadata(id, {
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

      await createWorkspaceForOwner(id, "My Workspace", { isDefault: true });

      break;
    }

    case "user.deleted": {
      await getSupabaseAdmin().from("users").delete().eq("id", event.data.id);
      break;
    }
  }

  return Response.json({ success: true });
}

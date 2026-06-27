import { clerkClient, WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";

export async function POST(req: Request) {
  const payload = await req.text();
  const headerPayload = await headers();
  const svixHeaders = {
    "svix-id": headerPayload.get("svix-id")!,
    "svix-timestamp": headerPayload.get("svix-timestamp")!,
    "svix-signature": headerPayload.get("svix-signature")!,
  };

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
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

      const isSuperAdmin = email === process.env.SUPER_ADMIN_EMAIL;
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
      if (process.env.STRIPE_SECRET_KEY) {
        const customer = await getStripe().customers.create({
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

      await supabase.from("agents").insert({
        user_id: id,
        name: "Monzi",
        slug: "aria",
        role: "general_assistant",
        is_default: true,
      });

      break;
    }

    case "user.deleted": {
      await getSupabaseAdmin().from("users").delete().eq("id", event.data.id);
      break;
    }
  }

  return Response.json({ success: true });
}

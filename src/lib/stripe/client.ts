import Stripe from "stripe";

import { getPlatformSecret } from "@/lib/platform/config";

let stripeClient: Stripe | null = null;
let stripeClientKey: string | null = null;

export function resetStripeClient(): void {
  stripeClient = null;
  stripeClientKey = null;
}

export async function getStripe(): Promise<Stripe> {
  const key = await getPlatformSecret("stripe.secret_key");
  if (!key) {
    throw new Error("Stripe secret key is not configured");
  }
  if (stripeClient && stripeClientKey === key) {
    return stripeClient;
  }
  stripeClient = new Stripe(key, {
    typescript: true,
  });
  stripeClientKey = key;
  return stripeClient;
}

export async function isStripeConfigured(): Promise<boolean> {
  const key = await getPlatformSecret("stripe.secret_key");
  return Boolean(key?.trim());
}

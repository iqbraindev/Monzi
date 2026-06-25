import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Stripe secret key is not configured");
    }
    stripeClient = new Stripe(key, {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }
  return stripeClient;
}

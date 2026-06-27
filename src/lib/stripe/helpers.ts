import type Stripe from "stripe";

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

export function getSubscriptionPeriod(sub: Stripe.Subscription): {
  start: number;
  end: number;
} {
  const extended = sub as SubscriptionWithPeriod;
  return {
    start: extended.current_period_start,
    end: extended.current_period_end,
  };
}

export function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice
): string | null {
  const sub = (invoice as InvoiceWithSubscription).subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type { BillingCycle } from "@/lib/billing/types";

const ENV_PRICE_MAP: Record<string, Record<BillingCycle, string | undefined>> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
  business: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
  },
};

export async function getStripePriceId(
  slug: string,
  cycle: BillingCycle
): Promise<string | null> {
  if (slug === "free") return null;

  const supabase = getSupabaseAdmin();
  const { data: pack } = await supabase
    .from("packs")
    .select("stripe_price_id_monthly, stripe_price_id_yearly")
    .eq("slug", slug)
    .maybeSingle();

  const fromDb =
    cycle === "monthly"
      ? pack?.stripe_price_id_monthly
      : pack?.stripe_price_id_yearly;

  if (fromDb) return fromDb;

  return ENV_PRICE_MAP[slug]?.[cycle] ?? null;
}

export async function buildPriceIdToSlugMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const supabase = getSupabaseAdmin();

  const { data: packs } = await supabase
    .from("packs")
    .select("slug, stripe_price_id_monthly, stripe_price_id_yearly");

  for (const pack of packs ?? []) {
    if (pack.stripe_price_id_monthly) {
      map.set(pack.stripe_price_id_monthly, pack.slug);
    }
    if (pack.stripe_price_id_yearly) {
      map.set(pack.stripe_price_id_yearly, pack.slug);
    }
  }

  for (const [slug, cycles] of Object.entries(ENV_PRICE_MAP)) {
    for (const priceId of Object.values(cycles)) {
      if (priceId) map.set(priceId, slug);
    }
  }

  return map;
}

export async function getPlanSlugFromPriceId(
  priceId: string
): Promise<string | null> {
  const map = await buildPriceIdToSlugMap();
  return map.get(priceId) ?? null;
}

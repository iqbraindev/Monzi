import { getPlatformSetting } from "@/lib/platform/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type { BillingCycle } from "@/lib/billing/types";

async function getEnvPriceMap(): Promise<
  Record<string, Record<BillingCycle, string | undefined>>
> {
  return {
    starter: {
      monthly: (await getPlatformSetting("stripe.price_starter_monthly")) ?? undefined,
      yearly: (await getPlatformSetting("stripe.price_starter_yearly")) ?? undefined,
    },
    pro: {
      monthly: (await getPlatformSetting("stripe.price_pro_monthly")) ?? undefined,
      yearly: (await getPlatformSetting("stripe.price_pro_yearly")) ?? undefined,
    },
    business: {
      monthly:
        (await getPlatformSetting("stripe.price_business_monthly")) ?? undefined,
      yearly: (await getPlatformSetting("stripe.price_business_yearly")) ?? undefined,
    },
  };
}

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

  const envMap = await getEnvPriceMap();
  return envMap[slug]?.[cycle] ?? null;
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

  const envMap = await getEnvPriceMap();
  for (const [slug, cycles] of Object.entries(envMap)) {
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

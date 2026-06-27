import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type { BillingBreakdown } from "@/lib/admin/types";

function monthPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getBillingBreakdown(): Promise<BillingBreakdown> {
  const supabase = getSupabaseAdmin();
  const { start, end } = monthPeriod();

  const { data: subs } = await supabase.from("subscriptions").select(`
      status,
      billing_cycle,
      canceled_at,
      pack:packs ( name, slug, price_monthly, price_yearly )
    `);

  let mrr = 0;
  let activeSubscriptions = 0;
  let trialingSubscriptions = 0;
  let pastDueSubscriptions = 0;
  let canceledThisMonth = 0;
  const packMap = new Map<
    string,
    { pack_name: string; pack_slug: string; count: number; mrr: number }
  >();

  for (const sub of subs ?? []) {
    if (sub.status === "active") activeSubscriptions += 1;
    if (sub.status === "trialing") trialingSubscriptions += 1;
    if (sub.status === "past_due") pastDueSubscriptions += 1;

    if (sub.canceled_at && sub.canceled_at >= start && sub.canceled_at < end) {
      canceledThisMonth += 1;
    }

    const pack = Array.isArray(sub.pack) ? sub.pack[0] : sub.pack;
    if (!pack || sub.status !== "active") continue;

    const monthly = Number(pack.price_monthly ?? 0);
    const yearly = Number(pack.price_yearly ?? 0);
    const subMrr = sub.billing_cycle === "yearly" ? yearly / 12 : monthly;
    mrr += subMrr;

    const key = pack.slug as string;
    const existing = packMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.mrr += subMrr;
    } else {
      packMap.set(key, {
        pack_name: pack.name as string,
        pack_slug: pack.slug as string,
        count: 1,
        mrr: subMrr,
      });
    }
  }

  const revenueByPack = [...packMap.values()]
    .map((row) => ({
      ...row,
      mrr: Math.round(row.mrr * 100) / 100,
    }))
    .sort((a, b) => b.mrr - a.mrr);

  mrr = Math.round(mrr * 100) / 100;

  return {
    mrr,
    arr: Math.round(mrr * 12 * 100) / 100,
    activeSubscriptions,
    trialingSubscriptions,
    pastDueSubscriptions,
    canceledThisMonth,
    revenueByPack,
  };
}

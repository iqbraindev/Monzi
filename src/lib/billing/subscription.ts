import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";

import type {
  BillingOverview,
  Pack,
  PackLimits,
  PaymentMethodInfo,
  UsageSnapshot,
} from "@/lib/billing/types";
import { getCurrentUsage } from "@/lib/billing/usage";

const DEFAULT_LIMITS: PackLimits = {
  max_agents: 1,
  max_subaccounts: 0,
  ai_messages_per_month: 50,
  ai_messages_per_day: 10,
  max_dashboards: 1,
  max_widgets_per_dashboard: 5,
  max_integrations: 1,
  voice_enabled: false,
  custom_avatar_enabled: false,
  storage_mb: 100,
  agent_energy_default: 25_000,
  agent_energy_max: 50_000,
  support_level: "community",
};

function mergeLimits(
  base: PackLimits,
  custom: Record<string, unknown> | null
): PackLimits {
  if (!custom) return base;
  return {
    ...base,
    ...(typeof custom.max_agents === "number"
      ? { max_agents: custom.max_agents }
      : {}),
    ...(typeof custom.max_integrations === "number"
      ? { max_integrations: custom.max_integrations }
      : {}),
    ...(typeof custom.voice_enabled === "boolean"
      ? { voice_enabled: custom.voice_enabled }
      : {}),
    ...(typeof custom.custom_avatar_enabled === "boolean"
      ? { custom_avatar_enabled: custom.custom_avatar_enabled }
      : {}),
    ...(typeof custom.agent_energy_default === "number"
      ? { agent_energy_default: custom.agent_energy_default }
      : {}),
    ...(typeof custom.agent_energy_max === "number"
      ? { agent_energy_max: custom.agent_energy_max }
      : {}),
    ...(typeof custom.ai_messages_per_month === "number"
      ? { ai_messages_per_month: custom.ai_messages_per_month }
      : {}),
  };
}

function rowToLimits(row: Record<string, unknown> | null): PackLimits {
  if (!row) return DEFAULT_LIMITS;
  return {
    max_agents: (row.max_agents as number) ?? DEFAULT_LIMITS.max_agents,
    max_subaccounts:
      (row.max_subaccounts as number) ?? DEFAULT_LIMITS.max_subaccounts,
    ai_messages_per_month:
      (row.ai_messages_per_month as number) ??
      DEFAULT_LIMITS.ai_messages_per_month,
    ai_messages_per_day:
      (row.ai_messages_per_day as number) ?? DEFAULT_LIMITS.ai_messages_per_day,
    max_dashboards:
      (row.max_dashboards as number) ?? DEFAULT_LIMITS.max_dashboards,
    max_widgets_per_dashboard:
      (row.max_widgets_per_dashboard as number) ??
      DEFAULT_LIMITS.max_widgets_per_dashboard,
    max_integrations:
      (row.max_integrations as number) ?? DEFAULT_LIMITS.max_integrations,
    voice_enabled:
      (row.voice_enabled as boolean) ?? DEFAULT_LIMITS.voice_enabled,
    custom_avatar_enabled:
      (row.custom_avatar_enabled as boolean) ??
      DEFAULT_LIMITS.custom_avatar_enabled,
    storage_mb: (row.storage_mb as number) ?? DEFAULT_LIMITS.storage_mb,
    agent_energy_default:
      (row.agent_energy_default as number) ??
      DEFAULT_LIMITS.agent_energy_default,
    agent_energy_max:
      (row.agent_energy_max as number) ?? DEFAULT_LIMITS.agent_energy_max,
    support_level:
      (row.support_level as string) ?? DEFAULT_LIMITS.support_level,
  };
}

export async function getPublicPacks(): Promise<Pack[]> {
  const supabase = getSupabaseAdmin();
  const { data: packs } = await supabase
    .from("packs")
    .select(
      "id, name, slug, description, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly, is_active, is_public, sort_order, pack_limits(*)"
    )
    .eq("is_active", true)
    .eq("is_public", true)
    .order("sort_order");

  return (packs ?? []).map((p) => {
    const limitsRow = Array.isArray(p.pack_limits)
      ? p.pack_limits[0]
      : p.pack_limits;
    const { pack_limits: _, ...pack } = p;
    return {
      ...pack,
      limits: rowToLimits(limitsRow as Record<string, unknown> | null),
    } as Pack;
  });
}

export async function getAllPacks(): Promise<Pack[]> {
  const supabase = getSupabaseAdmin();
  const { data: packs } = await supabase
    .from("packs")
    .select(
      "id, name, slug, description, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly, is_active, is_public, sort_order, pack_limits(*)"
    )
    .order("sort_order");

  return (packs ?? []).map((p) => {
    const limitsRow = Array.isArray(p.pack_limits)
      ? p.pack_limits[0]
      : p.pack_limits;
    const { pack_limits: _, ...pack } = p;
    return {
      ...pack,
      limits: rowToLimits(limitsRow as Record<string, unknown> | null),
    } as Pack;
  });
}

async function getPaymentMethod(
  customerId: string | null
): Promise<PaymentMethodInfo | null> {
  if (!customerId || !process.env.STRIPE_SECRET_KEY) return null;

  try {
    const customer = await getStripe().customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"],
    });

    if (customer.deleted) return null;

    const pm = customer.invoice_settings?.default_payment_method;
    if (!pm || typeof pm === "string") return null;

    const card = pm.card;
    if (!card) return null;

    return {
      brand: card.brand,
      last4: card.last4,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
    };
  } catch {
    return null;
  }
}

export async function getBillingOverview(
  userId: string
): Promise<BillingOverview> {
  const supabase = getSupabaseAdmin();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      `
      status,
      billing_cycle,
      current_period_start,
      current_period_end,
      trial_ends_at,
      canceled_at,
      stripe_customer_id,
      custom_limits,
      pack:packs (
        id, name, slug, description, price_monthly, price_yearly
      )
    `
    )
    .eq("user_id", userId)
    .single();

  const packRow = Array.isArray(sub?.pack) ? sub.pack[0] : sub?.pack;
  const pack = (packRow ?? {
    id: "",
    name: "Free",
    slug: "free",
    description: null,
    price_monthly: 0,
    price_yearly: 0,
  }) as BillingOverview["pack"];

  let baseLimits = DEFAULT_LIMITS;
  if (pack.id) {
    const { data: limitsRow } = await supabase
      .from("pack_limits")
      .select("*")
      .eq("pack_id", pack.id)
      .maybeSingle();
    baseLimits = rowToLimits(limitsRow);
  }

  const limits = mergeLimits(
    baseLimits,
    (sub?.custom_limits as Record<string, unknown> | null) ?? null
  );

  const usage: UsageSnapshot = await getCurrentUsage(userId);
  const availablePacks = await getPublicPacks();
  const paymentMethod = await getPaymentMethod(sub?.stripe_customer_id ?? null);

  return {
    subscription: {
      status: sub?.status ?? "active",
      billing_cycle: (sub?.billing_cycle as "monthly" | "yearly") ?? null,
      current_period_start: sub?.current_period_start ?? null,
      current_period_end: sub?.current_period_end ?? null,
      trial_ends_at: sub?.trial_ends_at ?? null,
      canceled_at: sub?.canceled_at ?? null,
    },
    pack,
    limits,
    usage,
    paymentMethod,
    availablePacks,
  };
}

export async function getStripeCustomerId(
  userId: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.stripe_customer_id ?? null;
}

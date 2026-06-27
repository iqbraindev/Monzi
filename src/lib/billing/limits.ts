import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function getSubscriptionLimits(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("pack_id, custom_limits")
    .eq("user_id", userId)
    .single();

  if (!subscription?.pack_id) return { subscription, limits: null };

  const { data: limits } = await supabase
    .from("pack_limits")
    .select("voice_enabled, max_agents, custom_avatar_enabled")
    .eq("pack_id", subscription.pack_id)
    .single();

  return { subscription, limits };
}

export async function getUserVoiceEnabled(userId: string): Promise<boolean> {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.MONZI_VOICE_DEV === "true"
  ) {
    return true;
  }

  const { subscription, limits } = await getSubscriptionLimits(userId);

  const customVoice = (
    subscription?.custom_limits as { voice_enabled?: boolean } | null
  )?.voice_enabled;

  if (typeof customVoice === "boolean") return customVoice;

  return limits?.voice_enabled ?? false;
}

export async function getUserAgentLimit(userId: string): Promise<number> {
  if (process.env.NODE_ENV === "development") {
    return -1;
  }

  const { subscription, limits } = await getSubscriptionLimits(userId);

  const customMax = (
    subscription?.custom_limits as { max_agents?: number } | null
  )?.max_agents;

  if (typeof customMax === "number") return customMax;

  return limits?.max_agents ?? 1;
}

export async function getUserCustomAvatarEnabled(
  userId: string
): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const { subscription, limits } = await getSubscriptionLimits(userId);

  const custom = (
    subscription?.custom_limits as { custom_avatar_enabled?: boolean } | null
  )?.custom_avatar_enabled;

  if (typeof custom === "boolean") return custom;

  return limits?.custom_avatar_enabled ?? false;
}

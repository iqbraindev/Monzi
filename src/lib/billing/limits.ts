import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getUserVoiceEnabled(userId: string): Promise<boolean> {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.MONZI_VOICE_DEV === "true"
  ) {
    return true;
  }

  const supabase = getSupabaseAdmin();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("pack_id, custom_limits")
    .eq("user_id", userId)
    .single();

  const customVoice = (
    subscription?.custom_limits as { voice_enabled?: boolean } | null
  )?.voice_enabled;

  if (typeof customVoice === "boolean") return customVoice;

  if (!subscription?.pack_id) return false;

  const { data: limits } = await supabase
    .from("pack_limits")
    .select("voice_enabled")
    .eq("pack_id", subscription.pack_id)
    .single();

  return limits?.voice_enabled ?? false;
}

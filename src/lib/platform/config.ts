import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { decryptSecret, encryptSecret } from "@/lib/platform/encrypt";

const CACHE_TTL_MS = 60_000;

/** Maps logical keys (provider.field) to env var names. */
export const ENV_KEY_MAP: Record<string, string> = {
  "openrouter.api_key": "OPENROUTER_API_KEY",
  "openrouter.model": "OPENROUTER_MODEL",
  "openrouter.model_fast": "OPENROUTER_MODEL_FAST",
  "openrouter.model_long": "OPENROUTER_MODEL_LONG",
  "openrouter.model_fallback": "OPENROUTER_MODEL_FALLBACK",
  "openrouter.embedding_model": "OPENROUTER_EMBEDDING_MODEL",
  "openrouter.stt_model": "OPENROUTER_STT_MODEL",
  "openrouter.tts_model": "OPENROUTER_TTS_MODEL",
  "composio.api_key": "COMPOSIO_API_KEY",
  "elevenlabs.api_key": "ELEVENLABS_API_KEY",
  "elevenlabs.agent_id": "ELEVENLABS_AGENT_ID",
  "elevenlabs.default_voice_id": "ELEVENLABS_DEFAULT_VOICE_ID",
  "elevenlabs.custom_llm_url": "ELEVENLABS_CUSTOM_LLM_URL",
  "elevenlabs.custom_llm_secret": "ELEVENLABS_CUSTOM_LLM_SECRET",
  "stripe.secret_key": "STRIPE_SECRET_KEY",
  "stripe.webhook_secret": "STRIPE_WEBHOOK_SECRET",
  "stripe.price_starter_monthly": "STRIPE_PRICE_STARTER_MONTHLY",
  "stripe.price_starter_yearly": "STRIPE_PRICE_STARTER_YEARLY",
  "stripe.price_pro_monthly": "STRIPE_PRICE_PRO_MONTHLY",
  "stripe.price_pro_yearly": "STRIPE_PRICE_PRO_YEARLY",
  "stripe.price_business_monthly": "STRIPE_PRICE_BUSINESS_MONTHLY",
  "stripe.price_business_yearly": "STRIPE_PRICE_BUSINESS_YEARLY",
  "clerk.secret_key": "CLERK_SECRET_KEY",
  "clerk.webhook_secret": "CLERK_WEBHOOK_SECRET",
  "deepgram.api_key": "DEEPGRAM_API_KEY",
  "deepgram.stt_model": "DEEPGRAM_STT_MODEL",
  "openai.api_key": "OPENAI_API_KEY",
  "openai.stt_model": "OPENAI_STT_MODEL",
};

const secretCache = new Map<string, { value: string | null; fetchedAt: number }>();
const settingCache = new Map<string, { value: string | null; fetchedAt: number }>();

export function maskSecret(value: string): string {
  if (value.length <= 4) return "••••";
  const visible = value.slice(-4);
  return `••••••••${visible}`;
}

function readEnv(key: string): string | null {
  const envVar = ENV_KEY_MAP[key];
  if (!envVar) return null;
  const value = process.env[envVar]?.trim();
  return value || null;
}

function isCacheValid(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < CACHE_TTL_MS;
}

export function bustPlatformConfigCache(keys?: string[]): void {
  if (!keys) {
    secretCache.clear();
    settingCache.clear();
    return;
  }
  for (const key of keys) {
    secretCache.delete(key);
    settingCache.delete(key);
  }
}

async function loadSecretFromDb(key: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("platform_secrets")
    .select("value_encrypted")
    .eq("key", key)
    .maybeSingle();

  if (!data?.value_encrypted) return null;
  return decryptSecret(data.value_encrypted);
}

async function loadSettingFromDb(key: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  return data?.value ?? null;
}

export async function hasDbSecret(key: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("platform_secrets")
    .select("key")
    .eq("key", key)
    .maybeSingle();
  return Boolean(data);
}

export async function hasDbSetting(key: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("platform_settings")
    .select("key")
    .eq("key", key)
    .maybeSingle();
  return Boolean(data);
}

export async function getPlatformSecret(key: string): Promise<string | null> {
  const cached = secretCache.get(key);
  if (cached && isCacheValid(cached.fetchedAt)) {
    return cached.value;
  }

  let value: string | null = null;
  try {
    value = await loadSecretFromDb(key);
  } catch {
    // DB unavailable or decrypt failed — fall through to env
  }

  if (!value) {
    value = readEnv(key);
  }

  secretCache.set(key, { value, fetchedAt: Date.now() });
  return value;
}

export async function getPlatformSetting(key: string): Promise<string | null> {
  const cached = settingCache.get(key);
  if (cached && isCacheValid(cached.fetchedAt)) {
    return cached.value;
  }

  let value: string | null = null;
  try {
    value = await loadSettingFromDb(key);
  } catch {
    // fall through
  }

  if (!value) {
    value = readEnv(key);
  }

  settingCache.set(key, { value, fetchedAt: Date.now() });
  return value;
}

export async function setPlatformSecret(
  key: string,
  value: string,
  actorId: string
): Promise<void> {
  const encrypted = encryptSecret(value);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("platform_secrets").upsert({
    key,
    value_encrypted: encrypted,
    updated_at: new Date().toISOString(),
    updated_by: actorId,
  });

  if (error) throw new Error(error.message);
  bustPlatformConfigCache([key]);
}

export async function setPlatformSetting(
  key: string,
  value: string,
  actorId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("platform_settings").upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: actorId,
  });

  if (error) throw new Error(error.message);
  bustPlatformConfigCache([key]);
}

export async function getFieldStatus(
  key: string,
  type: "secret" | "setting"
): Promise<{
  configured: boolean;
  source: "db" | "env" | null;
  maskedPreview: string | null;
}> {
  const inDb =
    type === "secret" ? await hasDbSecret(key) : await hasDbSetting(key);

  const value =
    type === "secret"
      ? await getPlatformSecret(key)
      : await getPlatformSetting(key);

  if (!value) {
    return { configured: false, source: null, maskedPreview: null };
  }

  const envValue = readEnv(key);
  let source: "db" | "env" = "env";
  if (inDb) {
    source = "db";
  } else if (envValue) {
    source = "env";
  }

  return {
    configured: true,
    source,
    maskedPreview: type === "secret" ? maskSecret(value) : value,
  };
}

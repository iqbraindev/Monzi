import { clerkClient } from "@clerk/nextjs/server";

import { getOpenRouterRequestHeaders } from "@/lib/ai/openrouter";
import { getFieldStatus, getPlatformSecret, getPlatformSetting, setPlatformSecret, setPlatformSetting } from "@/lib/platform/config";
import { getRedis } from "@/lib/redis/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type IntegrationFieldType = "secret" | "text";

export interface IntegrationFieldDef {
  key: string;
  label: string;
  type: IntegrationFieldType;
  envVar: string;
  editable: boolean;
  placeholder?: string;
}

export interface IntegrationProviderDef {
  id: string;
  label: string;
  description: string;
  docsUrl: string;
  editable: boolean;
  fields: IntegrationFieldDef[];
}

export const INTEGRATION_PROVIDERS: IntegrationProviderDef[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Primary LLM provider for agents, embeddings, and optional STT/TTS.",
    docsUrl: "https://openrouter.ai/docs",
    editable: true,
    fields: [
      { key: "openrouter.api_key", label: "API key", type: "secret", envVar: "OPENROUTER_API_KEY", editable: true },
      { key: "openrouter.model", label: "Primary model", type: "text", envVar: "OPENROUTER_MODEL", editable: true, placeholder: "openai/gpt-4o" },
      { key: "openrouter.model_fast", label: "Fast model", type: "text", envVar: "OPENROUTER_MODEL_FAST", editable: true, placeholder: "openai/gpt-4o-mini" },
      { key: "openrouter.model_long", label: "Long context model", type: "text", envVar: "OPENROUTER_MODEL_LONG", editable: true, placeholder: "anthropic/claude-sonnet-4" },
      { key: "openrouter.model_fallback", label: "Free fallback model", type: "text", envVar: "OPENROUTER_MODEL_FALLBACK", editable: true, placeholder: "cohere/north-mini-code:free" },
      { key: "openrouter.embedding_model", label: "Embedding model", type: "text", envVar: "OPENROUTER_EMBEDDING_MODEL", editable: true, placeholder: "openai/text-embedding-3-small" },
      { key: "openrouter.stt_model", label: "STT model", type: "text", envVar: "OPENROUTER_STT_MODEL", editable: true, placeholder: "openai/whisper-large-v3" },
      { key: "openrouter.tts_model", label: "TTS model", type: "text", envVar: "OPENROUTER_TTS_MODEL", editable: true, placeholder: "sesame/csm-1b" },
    ],
  },
  {
    id: "composio",
    label: "Composio",
    description: "Third-party app integrations (Gmail, Slack, etc.).",
    docsUrl: "https://docs.composio.dev",
    editable: true,
    fields: [
      { key: "composio.api_key", label: "API key", type: "secret", envVar: "COMPOSIO_API_KEY", editable: true },
    ],
  },
  {
    id: "elevenlabs",
    label: "ElevenLabs",
    description: "Live conversational voice and TTS.",
    docsUrl: "https://elevenlabs.io/docs",
    editable: true,
    fields: [
      { key: "elevenlabs.api_key", label: "API key", type: "secret", envVar: "ELEVENLABS_API_KEY", editable: true },
      { key: "elevenlabs.custom_llm_secret", label: "Custom LLM secret", type: "secret", envVar: "ELEVENLABS_CUSTOM_LLM_SECRET", editable: true },
      { key: "elevenlabs.agent_id", label: "Agent ID", type: "text", envVar: "ELEVENLABS_AGENT_ID", editable: true },
      { key: "elevenlabs.default_voice_id", label: "Default voice ID", type: "text", envVar: "ELEVENLABS_DEFAULT_VOICE_ID", editable: true },
      { key: "elevenlabs.custom_llm_url", label: "Custom LLM URL (dev/ngrok)", type: "text", envVar: "ELEVENLABS_CUSTOM_LLM_URL", editable: true },
    ],
  },
  {
    id: "stripe",
    label: "Stripe",
    description: "Subscription billing and webhooks.",
    docsUrl: "https://dashboard.stripe.com",
    editable: true,
    fields: [
      { key: "stripe.secret_key", label: "Secret key", type: "secret", envVar: "STRIPE_SECRET_KEY", editable: true },
      { key: "stripe.webhook_secret", label: "Webhook secret", type: "secret", envVar: "STRIPE_WEBHOOK_SECRET", editable: true },
      { key: "stripe.price_starter_monthly", label: "Starter monthly price ID", type: "text", envVar: "STRIPE_PRICE_STARTER_MONTHLY", editable: true },
      { key: "stripe.price_starter_yearly", label: "Starter yearly price ID", type: "text", envVar: "STRIPE_PRICE_STARTER_YEARLY", editable: true },
      { key: "stripe.price_pro_monthly", label: "Pro monthly price ID", type: "text", envVar: "STRIPE_PRICE_PRO_MONTHLY", editable: true },
      { key: "stripe.price_pro_yearly", label: "Pro yearly price ID", type: "text", envVar: "STRIPE_PRICE_PRO_YEARLY", editable: true },
      { key: "stripe.price_business_monthly", label: "Business monthly price ID", type: "text", envVar: "STRIPE_PRICE_BUSINESS_MONTHLY", editable: true },
      { key: "stripe.price_business_yearly", label: "Business yearly price ID", type: "text", envVar: "STRIPE_PRICE_BUSINESS_YEARLY", editable: true },
    ],
  },
  {
    id: "clerk",
    label: "Clerk",
    description: "Authentication and user webhooks.",
    docsUrl: "https://dashboard.clerk.com",
    editable: true,
    fields: [
      { key: "clerk.secret_key", label: "Secret key", type: "secret", envVar: "CLERK_SECRET_KEY", editable: true },
      { key: "clerk.webhook_secret", label: "Webhook secret", type: "secret", envVar: "CLERK_WEBHOOK_SECRET", editable: true },
    ],
  },
  {
    id: "deepgram",
    label: "Deepgram",
    description: "Preferred STT provider when configured.",
    docsUrl: "https://developers.deepgram.com",
    editable: true,
    fields: [
      { key: "deepgram.api_key", label: "API key", type: "secret", envVar: "DEEPGRAM_API_KEY", editable: true },
      { key: "deepgram.stt_model", label: "STT model", type: "text", envVar: "DEEPGRAM_STT_MODEL", editable: true, placeholder: "nova-3" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "Fallback STT when Deepgram and OpenRouter STT are unavailable.",
    docsUrl: "https://platform.openai.com",
    editable: true,
    fields: [
      { key: "openai.api_key", label: "API key", type: "secret", envVar: "OPENAI_API_KEY", editable: true },
      { key: "openai.stt_model", label: "STT model", type: "text", envVar: "OPENAI_STT_MODEL", editable: true, placeholder: "whisper-1" },
    ],
  },
];

export const STATUS_ONLY_PROVIDERS: IntegrationProviderDef[] = [
  {
    id: "supabase",
    label: "Supabase",
    description: "Database and storage (deploy-time only).",
    docsUrl: "https://supabase.com/dashboard",
    editable: false,
    fields: [
      { key: "supabase.url", label: "URL", type: "text", envVar: "NEXT_PUBLIC_SUPABASE_URL", editable: false },
      { key: "supabase.service_role", label: "Service role key", type: "secret", envVar: "SUPABASE_SERVICE_ROLE_KEY", editable: false },
    ],
  },
  {
    id: "redis",
    label: "Redis",
    description: "Cache and rate limiting (deploy-time only).",
    docsUrl: "https://upstash.com",
    editable: false,
    fields: [
      { key: "redis.url", label: "Redis URL", type: "secret", envVar: "REDIS_URL", editable: false },
    ],
  },
  {
    id: "observability",
    label: "Observability",
    description: "Langfuse, PostHog, and Sentry (deploy-time only).",
    docsUrl: "https://langfuse.com",
    editable: false,
    fields: [
      { key: "langfuse.public_key", label: "Langfuse public key", type: "text", envVar: "LANGFUSE_PUBLIC_KEY", editable: false },
      { key: "langfuse.secret_key", label: "Langfuse secret key", type: "secret", envVar: "LANGFUSE_SECRET_KEY", editable: false },
      { key: "posthog.key", label: "PostHog key", type: "text", envVar: "NEXT_PUBLIC_POSTHOG_KEY", editable: false },
      { key: "sentry.dsn", label: "Sentry DSN", type: "secret", envVar: "SENTRY_DSN", editable: false },
    ],
  },
];

const PLACEHOLDER = /^(sk-or-xxx|xxx|sk-xxx|whsec_xxx|pk-lf-xxx|sk-lf-xxx|phc_xxx)$/i;

function isRealValue(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return !PLACEHOLDER.test(value.trim());
}

function envStatus(envVar: string, type: IntegrationFieldType): {
  configured: boolean;
  source: "env" | null;
  maskedPreview: string | null;
} {
  const raw = process.env[envVar]?.trim();
  if (!isRealValue(raw)) {
    return { configured: false, source: null, maskedPreview: null };
  }
  return {
    configured: true,
    source: "env",
    maskedPreview: type === "secret" ? `••••••••${raw!.slice(-4)}` : raw!,
  };
}

export function getProviderById(id: string): IntegrationProviderDef | undefined {
  return [...INTEGRATION_PROVIDERS, ...STATUS_ONLY_PROVIDERS].find((p) => p.id === id);
}

export async function buildProviderStatus(provider: IntegrationProviderDef) {
  const fields = await Promise.all(
    provider.fields.map(async (field) => {
      if (!provider.editable) {
        return {
          key: field.key,
          label: field.label,
          type: field.type,
          editable: false,
          ...envStatus(field.envVar, field.type),
        };
      }

      const status = await getFieldStatus(
        field.key,
        field.type === "secret" ? "secret" : "setting"
      );

      return {
        key: field.key,
        label: field.label,
        type: field.type,
        editable: field.editable,
        placeholder: field.placeholder ?? null,
        ...status,
      };
    })
  );

  const connection = await testIntegrationProvider(provider.id).catch((err) => ({
    ok: false as const,
    error: err instanceof Error ? err.message : "Connection test failed",
  }));

  return {
    id: provider.id,
    label: provider.label,
    description: provider.description,
    docsUrl: provider.docsUrl,
    editable: provider.editable,
    fields,
    connection,
  };
}

export async function listIntegrationsStatus() {
  const editable = await Promise.all(
    INTEGRATION_PROVIDERS.map((p) => buildProviderStatus(p))
  );
  const statusOnly = await Promise.all(
    STATUS_ONLY_PROVIDERS.map((p) => buildProviderStatus(p))
  );
  return { providers: editable, infrastructure: statusOnly };
}

export async function testIntegrationProvider(
  providerId: string
): Promise<{ ok: boolean; error?: string }> {
  switch (providerId) {
    case "openrouter": {
      const key = await getPlatformSecret("openrouter.api_key");
      if (!isRealValue(key)) return { ok: false, error: "API key not configured" };
      const res = await fetch("https://openrouter.ai/api/v1/credits", {
        headers: {
          Authorization: `Bearer ${key}`,
          ...getOpenRouterRequestHeaders(),
        },
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: `OpenRouter API error (${res.status}): ${text.slice(0, 120)}` };
      }
      return { ok: true };
    }

    case "composio": {
      const key = await getPlatformSecret("composio.api_key");
      if (!isRealValue(key)) return { ok: false, error: "API key not configured" };
      const { Composio } = await import("@composio/core");
      const client = new Composio({ apiKey: key!, toolkitVersions: "latest" });
      await client.connectedAccounts.list({ limit: 1 });
      return { ok: true };
    }

    case "elevenlabs": {
      const key = await getPlatformSecret("elevenlabs.api_key");
      if (!isRealValue(key)) return { ok: false, error: "API key not configured" };
      const res = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": key! },
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: `ElevenLabs API error (${res.status}): ${text.slice(0, 120)}` };
      }
      return { ok: true };
    }

    case "stripe": {
      const key = await getPlatformSecret("stripe.secret_key");
      if (!isRealValue(key)) return { ok: false, error: "Secret key not configured" };
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(key!, { apiVersion: "2026-05-27.dahlia", typescript: true });
      await stripe.balance.retrieve();
      return { ok: true };
    }

    case "clerk": {
      const key = await getPlatformSecret("clerk.secret_key");
      if (!isRealValue(key)) return { ok: false, error: "Secret key not configured" };
      const client = await clerkClient();
      await client.users.getUserList({ limit: 1 });
      return { ok: true };
    }

    case "deepgram": {
      const key = await getPlatformSecret("deepgram.api_key");
      if (!isRealValue(key)) return { ok: false, error: "API key not configured" };
      const res = await fetch("https://api.deepgram.com/v1/projects", {
        headers: { Authorization: `Token ${key}` },
        cache: "no-store",
      });
      if (!res.ok) {
        return { ok: false, error: `Deepgram API error (${res.status})` };
      }
      return { ok: true };
    }

    case "openai": {
      const key = await getPlatformSecret("openai.api_key");
      if (!isRealValue(key)) return { ok: false, error: "API key not configured" };
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      if (!res.ok) {
        return { ok: false, error: `OpenAI API error (${res.status})` };
      }
      return { ok: true };
    }

    case "supabase": {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !serviceKey) return { ok: false, error: "Not configured" };
      const { error } = await getSupabaseAdmin().from("packs").select("id").limit(1);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    case "redis": {
      if (!process.env.REDIS_URL) return { ok: false, error: "Not configured" };
      const pong = await getRedis().ping();
      return pong === "PONG" ? { ok: true } : { ok: false, error: "Unexpected ping response" };
    }

    case "observability": {
      const langfuse = isRealValue(process.env.LANGFUSE_SECRET_KEY);
      const posthog = isRealValue(process.env.NEXT_PUBLIC_POSTHOG_KEY);
      const sentry = isRealValue(process.env.SENTRY_DSN);
      if (!langfuse && !posthog && !sentry) {
        return { ok: false, error: "No observability tools configured" };
      }
      return { ok: true };
    }

    default:
      return { ok: false, error: "Unknown provider" };
  }
}

export async function updateIntegrationProvider(
  providerId: string,
  body: Record<string, string>,
  actorId: string
): Promise<string[]> {
  const provider = getProviderById(providerId);
  if (!provider?.editable) {
    throw new Error("Provider is not editable");
  }

  const changed: string[] = [];

  for (const field of provider.fields) {
    if (!field.editable) continue;
    const raw = body[field.key];
    if (raw === undefined) continue;
    if (field.type === "secret" && raw.trim() === "") continue;

    if (field.type === "secret") {
      await setPlatformSecret(field.key, raw.trim(), actorId);
    } else {
      await setPlatformSetting(field.key, raw.trim(), actorId);
    }
    changed.push(field.key);
  }

  return changed;
}

export async function getOpenRouterModelsFromConfig() {
  return {
    primary: (await getPlatformSetting("openrouter.model")) ?? "openai/gpt-4o",
    fast: (await getPlatformSetting("openrouter.model_fast")) ?? "openai/gpt-4o-mini",
    fallback:
      (await getPlatformSetting("openrouter.model_fallback"))?.trim() ||
      "cohere/north-mini-code:free",
    longContext:
      (await getPlatformSetting("openrouter.model_long")) ?? "anthropic/claude-sonnet-4",
    embedding:
      (await getPlatformSetting("openrouter.embedding_model")) ??
      "openai/text-embedding-3-small",
    stt: (await getPlatformSetting("openrouter.stt_model")) ?? "openai/whisper-large-v3",
    tts: (await getPlatformSetting("openrouter.tts_model")) ?? "sesame/csm-1b",
  };
}

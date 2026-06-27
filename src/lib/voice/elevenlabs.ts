import type { DbAgent } from "@/lib/agents/adapter";
import { getPlatformSecret, getPlatformSetting } from "@/lib/platform/config";
import { clampElevenLabsSpeed } from "@/lib/voice/sanitize-speech";
import { normalizeAgentVoiceId } from "@/lib/voice/voice-options";

const ELEVENLABS_API = "https://api.elevenlabs.io";

export async function getElevenLabsAgentId(): Promise<string | null> {
  return (await getPlatformSetting("elevenlabs.agent_id")) ?? null;
}

export async function isElevenLabsVoiceConfigured(): Promise<boolean> {
  const [apiKey, agentId] = await Promise.all([
    getPlatformSecret("elevenlabs.api_key"),
    getPlatformSetting("elevenlabs.agent_id"),
  ]);
  return Boolean(apiKey && agentId);
}

/**
 * Requests a short-lived signed URL for a private ElevenLabs Conversational AI
 * agent. The browser uses this to open the realtime voice connection without
 * ever seeing the API key.
 */
export async function getElevenLabsSignedUrl(agentId: string): Promise<string> {
  const apiKey = await getPlatformSecret("elevenlabs.api_key");
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured.");

  const res = await fetch(
    `${ELEVENLABS_API}/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    { headers: { "xi-api-key": apiKey } }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Failed to get ElevenLabs signed URL (${res.status}): ${detail}`
    );
  }

  const data = (await res.json()) as { signed_url?: string };
  if (!data.signed_url) {
    throw new Error("ElevenLabs did not return a signed URL.");
  }
  return data.signed_url;
}

export interface VoiceOverrides {
  agent: {
    prompt: { prompt: string };
    firstMessage: string;
    language: string;
  };
  tts?: { voiceId: string; speed?: number };
}

function buildVoicePrompt(agent: DbAgent): string {
  return `You are ${agent.name}, a voice assistant for Monzi.`;
}

export function buildVoiceGreeting(agent: DbAgent): string {
  return `Hey! I'm ${agent.name}. Need me to help with anything?`;
}

function isElevenLabsVoiceId(value: string | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9]{16,}$/.test(value));
}

export async function resolveVoiceId(agent: DbAgent): Promise<string | undefined> {
  const normalized = normalizeAgentVoiceId(agent.voice?.voice_id);
  if (agent.voice?.provider === "elevenlabs" || isElevenLabsVoiceId(normalized)) {
    return normalized;
  }
  const envDefault = await getPlatformSetting("elevenlabs.default_voice_id");
  return isElevenLabsVoiceId(envDefault ?? undefined) ? envDefault! : normalized;
}

export async function buildVoiceOverrides(agent: DbAgent): Promise<VoiceOverrides> {
  const language = agent.personality?.language?.trim() || "en";

  const overrides: VoiceOverrides = {
    agent: {
      prompt: { prompt: buildVoicePrompt(agent) },
      firstMessage: buildVoiceGreeting(agent),
      language,
    },
  };

  const voiceId = await resolveVoiceId(agent);
  const speed = clampElevenLabsSpeed(agent.voice?.speed ?? 1);
  if (voiceId) {
    overrides.tts = { voiceId, speed };
  }

  return overrides;
}

export async function getElevenLabsCustomLlmSecret(): Promise<string | null> {
  return getPlatformSecret("elevenlabs.custom_llm_secret");
}

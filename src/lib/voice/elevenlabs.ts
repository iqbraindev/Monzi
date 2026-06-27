import type { DbAgent } from "@/lib/agents/adapter";
import { clampElevenLabsSpeed } from "@/lib/voice/sanitize-speech";
import { normalizeAgentVoiceId } from "@/lib/voice/voice-options";

const ELEVENLABS_API = "https://api.elevenlabs.io";

export function getElevenLabsAgentId(): string | null {
  return process.env.ELEVENLABS_AGENT_ID ?? null;
}

export function isElevenLabsVoiceConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID);
}

/**
 * Requests a short-lived signed URL for a private ElevenLabs Conversational AI
 * agent. The browser uses this to open the realtime voice connection without
 * ever seeing the API key.
 */
export async function getElevenLabsSignedUrl(agentId: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
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

/**
 * Minimal per-call prompt override for ElevenLabs UI. The real system prompt
 * (with Composio tools, dashboard control, etc.) is served by our custom LLM.
 */
function buildVoicePrompt(agent: DbAgent): string {
  return `You are ${agent.name}, a voice assistant for Monzi.`;
}

/**
 * ElevenLabs voice ids are ~20-char opaque strings (e.g. "cjVigY5qzO86Huf0OWal"),
 * not human names like legacy OpenAI presets stored on some agents.
 */
function isElevenLabsVoiceId(value: string | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9]{16,}$/.test(value));
}

/** Resolves the voice id for a call: per-agent ElevenLabs voice → env default. */
export function resolveVoiceId(agent: DbAgent): string | undefined {
  const normalized = normalizeAgentVoiceId(agent.voice?.voice_id);
  if (agent.voice?.provider === "elevenlabs" || isElevenLabsVoiceId(normalized)) {
    return normalized;
  }
  const envDefault = process.env.ELEVENLABS_DEFAULT_VOICE_ID;
  return isElevenLabsVoiceId(envDefault) ? envDefault : normalized;
}

export function buildVoiceOverrides(agent: DbAgent): VoiceOverrides {
  const language = agent.personality?.language?.trim() || "en";

  const overrides: VoiceOverrides = {
    agent: {
      prompt: { prompt: buildVoicePrompt(agent) },
      // Empty — Monzi custom LLM speaks the one-time intro; prevents EL replay on empty LLM responses.
      firstMessage: "",
      language,
    },
  };

  const voiceId = resolveVoiceId(agent);
  const speed = clampElevenLabsSpeed(agent.voice?.speed ?? 1);
  if (voiceId) {
    overrides.tts = { voiceId, speed };
  }

  return overrides;
}

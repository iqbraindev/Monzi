import {
  FALLBACK_VOICE_OPTIONS,
  type AgentVoiceOption,
} from "@/lib/voice/voice-options";

const ELEVENLABS_API = "https://api.elevenlabs.io";
const CACHE_MS = 5 * 60 * 1000;

let cachedVoices: { data: AgentVoiceOption[]; fetchedAt: number } | null = null;

function parseVoiceName(raw: string): { label: string; description: string } {
  const dash = raw.indexOf(" - ");
  if (dash === -1) return { label: raw, description: "" };
  return {
    label: raw.slice(0, dash).trim(),
    description: raw.slice(dash + 3).trim(),
  };
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function fetchElevenLabsVoiceOptions(): Promise<AgentVoiceOption[]> {
  const now = Date.now();
  if (cachedVoices && now - cachedVoices.fetchedAt < CACHE_MS) {
    return cachedVoices.data;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return FALLBACK_VOICE_OPTIONS;
  }

  try {
    const res = await fetch(`${ELEVENLABS_API}/v1/voices`, {
      headers: { "xi-api-key": apiKey },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return FALLBACK_VOICE_OPTIONS;
    }

    const json = (await res.json()) as {
      voices?: Array<{
        voice_id: string;
        name: string;
        labels?: { accent?: string; gender?: string; description?: string };
      }>;
    };

    const options: AgentVoiceOption[] = (json.voices ?? [])
      .map((voice) => {
        const { label, description } = parseVoiceName(voice.name);
        return {
          id: voice.voice_id,
          label,
          description:
            description ||
            voice.labels?.description?.replace(/_/g, " ") ||
            "ElevenLabs voice",
          accent: voice.labels?.accent
            ? capitalize(voice.labels.accent)
            : undefined,
          gender: voice.labels?.gender,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    if (options.length === 0) {
      return FALLBACK_VOICE_OPTIONS;
    }

    cachedVoices = { data: options, fetchedAt: now };
    return options;
  } catch {
    return FALLBACK_VOICE_OPTIONS;
  }
}

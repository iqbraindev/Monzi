import {
  getOpenRouterApiKey,
  getOpenRouterRequestHeaders,
} from "@/lib/ai/openrouter";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
/** OpenRouter TTS — sesame/csm-1b works on all accounts; openai/gpt-4o-mini-tts-* when available. */
export const DEFAULT_OPENROUTER_TTS_MODEL = "sesame/csm-1b";

/** Whether the model honors a fixed voice across separate synthesis calls. */
export function modelSupportsStableVoice(model: string): boolean {
  if (model.startsWith("sesame/")) return false;
  return /^(openai|microsoft|google|hexgrad)\//.test(model);
}

export async function synthesizeSpeech(
  text: string,
  _voice = "nova",
  speed = 1
): Promise<ArrayBuffer> {
  const model =
    process.env.OPENROUTER_TTS_MODEL ?? DEFAULT_OPENROUTER_TTS_MODEL;
  const voice = "nova";
  const res = await fetch(`${OPENROUTER_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
      "Content-Type": "application/json",
      ...getOpenRouterRequestHeaders(),
    },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      speed,
      response_format: model.startsWith("google/") ? "pcm" : "mp3",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[tts] OpenRouter error body:", errText);
    throw new Error(errText || `TTS failed (${res.status})`);
  }

  return res.arrayBuffer();
}

import {
  getOpenRouterApiKey,
  getOpenRouterRequestHeaders,
} from "@/lib/ai/openrouter";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const PLACEHOLDER = /^(sk-or-xxx|xxx|sk-xxx)$/i;

function isDeepgramConfigured(): boolean {
  const key = process.env.DEEPGRAM_API_KEY?.trim();
  return Boolean(key && !PLACEHOLDER.test(key));
}

function isOpenAiConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  return Boolean(key && !PLACEHOLDER.test(key));
}

function audioFormatFromMime(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

async function transcribeWithDeepgram(
  buffer: ArrayBuffer,
  mimeType: string,
  language?: string
): Promise<string> {
  const params = new URLSearchParams({
    model: process.env.DEEPGRAM_STT_MODEL ?? "nova-3",
    smart_format: "true",
  });
  if (language) params.set("language", language.split("-")[0]!);

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      "Content-Type": mimeType || "audio/webm",
    },
    body: buffer,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Deepgram STT failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };
  return data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
}

async function transcribeWithOpenRouter(
  buffer: ArrayBuffer,
  mimeType: string,
  language?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    model: process.env.OPENROUTER_STT_MODEL ?? "openai/whisper-large-v3",
    input_audio: {
      data: Buffer.from(buffer).toString("base64"),
      format: audioFormatFromMime(mimeType),
    },
  };
  if (language) body.language = language.split("-")[0];

  const res = await fetch(`${OPENROUTER_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
      "Content-Type": "application/json",
      ...getOpenRouterRequestHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter STT failed (${res.status}): ${errText.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as { text?: string };
  return data.text?.trim() ?? "";
}

async function transcribeWithOpenAI(
  buffer: ArrayBuffer,
  mimeType: string,
  language?: string
): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const file = new File([buffer], "recording.webm", { type: mimeType });

  const result = await client.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_STT_MODEL ?? "whisper-1",
    ...(language ? { language: language.split("-")[0] } : {}),
  });

  return result.text?.trim() ?? "";
}

export async function transcribeAudio(
  buffer: ArrayBuffer,
  mimeType: string,
  language?: string
): Promise<string> {
  if (isDeepgramConfigured()) {
    return transcribeWithDeepgram(buffer, mimeType, language);
  }

  try {
    return await transcribeWithOpenRouter(buffer, mimeType, language);
  } catch (openRouterError) {
    if (!isOpenAiConfigured()) throw openRouterError;
    return transcribeWithOpenAI(buffer, mimeType, language);
  }
}

export function isTranscriptionConfigured(): boolean {
  if (isDeepgramConfigured()) return true;
  const openRouter = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouter && !PLACEHOLDER.test(openRouter)) return true;
  return isOpenAiConfigured();
}

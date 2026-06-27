import {
  getOpenRouterApiKey,
  getOpenRouterModels,
  getOpenRouterRequestHeaders,
} from "@/lib/ai/openrouter";
import { getPlatformSecret, getPlatformSetting } from "@/lib/platform/config";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const PLACEHOLDER = /^(sk-or-xxx|xxx|sk-xxx)$/i;

async function isDeepgramConfigured(): Promise<boolean> {
  const key = (await getPlatformSecret("deepgram.api_key"))?.trim();
  return Boolean(key && !PLACEHOLDER.test(key));
}

async function isOpenAiConfigured(): Promise<boolean> {
  const key = (await getPlatformSecret("openai.api_key"))?.trim();
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
  const apiKey = await getPlatformSecret("deepgram.api_key");
  const model = (await getPlatformSetting("deepgram.stt_model")) ?? "nova-3";
  const params = new URLSearchParams({
    model,
    smart_format: "true",
  });
  if (language) params.set("language", language.split("-")[0]!);

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
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
  const models = await getOpenRouterModels();
  const body: Record<string, unknown> = {
    model: models.stt,
    input_audio: {
      data: Buffer.from(buffer).toString("base64"),
      format: audioFormatFromMime(mimeType),
    },
  };
  if (language) body.language = language.split("-")[0];

  const res = await fetch(`${OPENROUTER_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getOpenRouterApiKey()}`,
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
  const apiKey = await getPlatformSecret("openai.api_key");
  const model = (await getPlatformSetting("openai.stt_model")) ?? "whisper-1";
  const client = new OpenAI({ apiKey: apiKey ?? undefined });
  const file = new File([buffer], "recording.webm", { type: mimeType });

  const result = await client.audio.transcriptions.create({
    file,
    model,
    ...(language ? { language: language.split("-")[0] } : {}),
  });

  return result.text?.trim() ?? "";
}

export async function transcribeAudio(
  buffer: ArrayBuffer,
  mimeType: string,
  language?: string
): Promise<string> {
  if (await isDeepgramConfigured()) {
    return transcribeWithDeepgram(buffer, mimeType, language);
  }

  try {
    return await transcribeWithOpenRouter(buffer, mimeType, language);
  } catch (openRouterError) {
    if (!(await isOpenAiConfigured())) throw openRouterError;
    return transcribeWithOpenAI(buffer, mimeType, language);
  }
}

export async function isTranscriptionConfigured(): Promise<boolean> {
  if (await isDeepgramConfigured()) return true;
  const openRouter = (await getPlatformSecret("openrouter.api_key"))?.trim();
  if (openRouter && !PLACEHOLDER.test(openRouter)) return true;
  return isOpenAiConfigured();
}

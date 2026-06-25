import { auth } from "@clerk/nextjs/server";

import { synthesizeSpeech } from "@/lib/ai/speak-audio";

export const maxDuration = 30;

const PLACEHOLDER = /^(sk-or-xxx|xxx|sk-xxx)$/i;

function isElevenLabsConfigured(): boolean {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  return Boolean(key && !PLACEHOLDER.test(key));
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      text?: string;
      voice?: string;
      voice_id?: string;
      provider?: "openai" | "elevenlabs" | "none";
      speed?: number;
    };

    const text = body.text?.trim();
    if (!text) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const clippedText = text.slice(0, 4000);
    const provider = body.provider ?? "openai";
    const voiceId = "nova";
    const speed = body.speed ?? 1;

    if (provider === "elevenlabs" && isElevenLabsConfigured()) {
      const elevenVoiceId =
        voiceId ??
        process.env.ELEVENLABS_DEFAULT_VOICE_ID ??
        "JBFqnCBsd6RMkjVDRZzb";
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}/stream`,
        {
          method: "POST",
          headers: {
            "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: clippedText,
            model_id: "eleven_turbo_v2",
            voice_settings: { stability: 0.4, similarity_boost: 0.8 },
          }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        console.error("[tts] ElevenLabs error body:", err);
        return Response.json(
          { error: "ElevenLabs TTS failed", detail: err },
          { status: 500 }
        );
      }
      return new Response(res.body, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
        },
      });
    }

    try {
      const audio = await synthesizeSpeech(clippedText, voiceId, speed);
      return new Response(audio, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error("[tts] OpenRouter error body:", detail);
      return Response.json({ error: "TTS failed", detail }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS failed";
    console.error("[tts]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

import { auth } from "@clerk/nextjs/server";

import {
  isTranscriptionConfigured,
  transcribeAudio,
} from "@/lib/ai/transcribe-audio";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isTranscriptionConfigured())) {
      return Response.json(
        { error: "Speech transcription is not configured on the server" },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio");
    const language = formData.get("language");

    if (!(audio instanceof Blob) || audio.size === 0) {
      return Response.json({ error: "No audio provided" }, { status: 400 });
    }

    const buffer = await audio.arrayBuffer();
    const text = await transcribeAudio(
      buffer,
      audio.type || "audio/webm",
      typeof language === "string" ? language : undefined
    );

    return Response.json({ text });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Transcription failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

import { auth } from "@clerk/nextjs/server";

import { fetchElevenLabsVoiceOptions } from "@/lib/voice/fetch-voices";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const voices = await fetchElevenLabsVoiceOptions();
    return Response.json({ voices });
  } catch (err) {
    console.error("[voices]", err);
    return Response.json({ error: "Failed to load voices" }, { status: 500 });
  }
}

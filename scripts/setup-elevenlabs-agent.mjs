// One-time setup: provisions an ElevenLabs Conversational AI agent for Monzi voice.
//
// The agent acts as a reusable "shell": each live call overrides the system prompt,
// first message, language, and voice per Monzi agent. Overrides are enabled here so
// those per-call values actually take effect.
//
// Usage:  node scripts/setup-elevenlabs-agent.mjs
// Then copy the printed ELEVENLABS_AGENT_ID into your .env.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      env[key] = value;
    }
  } catch {
    // no .env file; rely on process.env
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const apiKey = env.ELEVENLABS_API_KEY;
  const voiceId = env.ELEVENLABS_DEFAULT_VOICE_ID;

  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY in environment / .env");
    process.exit(1);
  }

  // Only pin a voice if one was explicitly requested AND we can confirm it exists
  // in this account. Otherwise let ElevenLabs use its platform default voice so
  // agent creation doesn't fail on a missing voice_id.
  let usableVoiceId;
  if (voiceId) {
    const check = await fetch(
      `https://api.elevenlabs.io/v1/voices/${voiceId}`,
      { headers: { "xi-api-key": apiKey } }
    );
    if (check.ok || check.status === 401 || check.status === 403) {
      // 401/403 means this API key is convai-scoped (no voice-library read access);
      // the voice may still be valid for the agent, so send it through.
      usableVoiceId = voiceId;
    } else {
      console.warn(
        `⚠️  ELEVENLABS_DEFAULT_VOICE_ID="${voiceId}" not found (${check.status}) — creating the agent with the platform default voice instead.`
      );
    }
  }

  const body = {
    name: "Monzi Voice (shell)",
    conversation_config: {
      agent: {
        first_message: "Hi, I'm listening — go ahead whenever you're ready.",
        language: "en",
        prompt: {
          prompt:
            "You are a helpful voice assistant for Monzi. Be concise, warm, and conversational. This prompt is overridden per call.",
          llm: "gpt-4o-mini",
        },
      },
      ...(usableVoiceId ? { tts: { voice_id: usableVoiceId } } : {}),
    },
    platform_settings: {
      overrides: {
        conversation_config_override: {
          agent: {
            first_message: true,
            language: true,
            prompt: { prompt: true },
          },
          tts: { voice_id: true },
        },
        custom_llm_extra_body: true,
      },
    },
  };

  const res = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`ElevenLabs create-agent failed (${res.status}):`);
    console.error(text);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Unexpected non-JSON response:", text);
    process.exit(1);
  }

  console.log("\n✅ ElevenLabs agent created.\n");
  console.log("Add this to your .env:\n");
  console.log(`ELEVENLABS_AGENT_ID=${data.agent_id}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

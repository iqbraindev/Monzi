// Configures the ElevenLabs Conversational AI agent to use Monzi's custom LLM
// (full agent brain with Composio tools) instead of ElevenLabs' built-in model.
//
// Usage:  node scripts/configure-elevenlabs-custom-llm.mjs
//
// For local dev, ElevenLabs must reach your app over the public internet.
// Set ELEVENLABS_CUSTOM_LLM_URL to your ngrok URL (e.g. https://abc.ngrok-free.app).

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
    // no .env
  }
  return env;
}

async function ensureSecret(apiKey, secretName, secretValue) {
  const list = await fetch("https://api.elevenlabs.io/v1/convai/secrets", {
    headers: { "xi-api-key": apiKey },
  });
  if (list.ok) {
    const data = await list.json();
    const existing = (data.secrets ?? []).find((s) => s.name === secretName);
    if (existing?.secret_id) {
      const update = await fetch(
        `https://api.elevenlabs.io/v1/convai/secrets/${existing.secret_id}`,
        {
          method: "PATCH",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "update",
            name: secretName,
            value: secretValue,
          }),
        }
      );
      if (!update.ok) {
        throw new Error(
          `Failed to update secret (${update.status}): ${await update.text()}`
        );
      }
      return existing.secret_id;
    }
  }

  const res = await fetch("https://api.elevenlabs.io/v1/convai/secrets", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "new",
      name: secretName,
      value: secretValue,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create secret (${res.status}): ${await res.text()}`);
  }

  const created = await res.json();
  return created.secret_id;
}

async function main() {
  const env = loadEnv();
  const apiKey = env.ELEVENLABS_API_KEY;
  const agentId = env.ELEVENLABS_AGENT_ID;
  const llmSecret = env.ELEVENLABS_CUSTOM_LLM_SECRET;
  const publicUrl =
    env.ELEVENLABS_CUSTOM_LLM_URL ??
    env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  if (!apiKey || !agentId || !llmSecret) {
    console.error(
      "Missing ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, or ELEVENLABS_CUSTOM_LLM_SECRET in .env"
    );
    process.exit(1);
  }

  if (publicUrl.includes("localhost") || publicUrl.includes("127.0.0.1")) {
    console.warn(
      "\n⚠️  Custom LLM URL is localhost — ElevenLabs servers cannot reach it.\n" +
        "   Voice tools will only work after you set ELEVENLABS_CUSTOM_LLM_URL to a public URL (e.g. ngrok).\n"
    );
  }

  const secretId = await ensureSecret(
    apiKey,
    "MONZI_CUSTOM_LLM_SECRET",
    llmSecret
  );

  // ElevenLabs appends "/chat/completions" to this URL — do NOT include that suffix.
  const customLlmUrl = `${publicUrl.replace(/\/$/, "")}/api/elevenlabs/v1`;

  const requestHeaders = {};
  if (publicUrl.includes("ngrok")) {
    // ngrok free tier returns an HTML interstitial unless this header is set.
    requestHeaders["ngrok-skip-browser-warning"] = "true";
  }

  const body = {
    conversation_config: {
      agent: {
        prompt: {
          llm: "custom-llm",
          custom_llm: {
            url: customLlmUrl,
            model_id: "monzi",
            api_key: { secret_id: secretId },
            request_headers: requestHeaders,
          },
        },
      },
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

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
    {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    console.error(`Failed to configure custom LLM (${res.status}):`);
    console.error(await res.text());
    process.exit(1);
  }

  console.log("\n✅ ElevenLabs agent configured with Monzi custom LLM.\n");
  console.log(`   Custom LLM base URL: ${customLlmUrl}`);
  console.log(`   Resolved endpoint:   ${customLlmUrl}/chat/completions`);
  console.log(`   Secret id:      ${secretId}`);
  console.log(
    "\nEnsure ELEVENLABS_CUSTOM_LLM_SECRET in .env matches the workspace secret value.\n"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

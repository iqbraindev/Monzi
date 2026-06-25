import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const env = { ...process.env };
  for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();
const base = (env.ELEVENLABS_CUSTOM_LLM_URL ?? "http://localhost:3000").replace(/\/$/, "");
// ElevenLabs appends /chat/completions to the configured base URL.
const url = `${base}/api/elevenlabs/v1/chat/completions`;

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.ELEVENLABS_CUSTOM_LLM_SECRET}`,
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    "User-Agent": "ElevenLabs/1.0",
  },
  body: JSON.stringify({
    messages: [{ role: "user", content: "hello" }],
    model: "monzi",
    stream: true,
  }),
});

console.log("URL:", url);
console.log("Status:", res.status);
const text = await res.text();
console.log("Body preview:", text.slice(0, 400));

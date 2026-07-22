import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// next.config runs before .env is loaded — read tunnel URLs here for allowedDevOrigins.
loadEnvConfig(process.cwd());

function parseAllowedDevOrigins(): string[] {
  const hosts = new Set<string>(["*.ngrok-free.dev", "*.ngrok-free.app"]);

  const envEntries = [
    process.env.ELEVENLABS_CUSTOM_LLM_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.ALLOWED_DEV_ORIGINS,
  ].filter(Boolean) as string[];

  for (const entry of envEntries) {
    for (const part of entry.split(",")) {
      const value = part.trim();
      if (!value) continue;
      try {
        hosts.add(new URL(value).hostname);
      } catch {
        hosts.add(value);
      }
    }
  }

  return [...hosts];
}

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: parseAllowedDevOrigins(),
  // Hide the Next.js "N" badge in local dev so the UI matches production.
  devIndicators: false,
};

export default nextConfig;

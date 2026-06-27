import { ROLE_PRESETS } from "@/lib/agents/presets";

/** @deprecated Use ROLE_PRESETS from presets.ts */
export const AGENT_ROLE_PRESETS = ROLE_PRESETS.map((r) => ({
  label: r.label,
  value: r.value,
  color: r.color,
}));

export const AGENT_COLOR_OPTIONS = [
  "#7C3AED",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#F43F5E",
  "#6366F1",
] as const;

export const AGENT_AVATAR_PRESETS = [
  { id: "avatar-01", label: "Nova", style: "illustrated" as const },
  { id: "avatar-02", label: "Pulse", style: "illustrated" as const },
  { id: "avatar-03", label: "Orbit", style: "illustrated" as const },
  { id: "avatar-04", label: "Spark", style: "illustrated" as const },
  { id: "avatar-05", label: "Flux", style: "illustrated" as const },
  { id: "avatar-06", label: "Echo", style: "illustrated" as const },
  { id: "avatar-07", label: "Prism", style: "illustrated" as const },
  { id: "avatar-08", label: "Aura", style: "illustrated" as const },
] as const;

/** @deprecated Use FALLBACK_VOICE_OPTIONS from @/lib/voice/voice-options */
export const VOICE_OPTIONS = [
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah", provider: "elevenlabs" as const },
  { id: "cjVigY5qzO86Huf0OWal", label: "Eric", provider: "elevenlabs" as const },
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George", provider: "elevenlabs" as const },
  { id: "IKne3meq5aSn9XLyUdCD", label: "Charlie", provider: "elevenlabs" as const },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
] as const;

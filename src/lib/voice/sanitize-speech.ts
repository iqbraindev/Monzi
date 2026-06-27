/**
 * Strips markdown, code, URLs, and noisy punctuation so TTS sounds natural.
 */
export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\[(.+?)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/[^\s]+/g, "link")
    .replace(/[^\w\s.,!?'"-]/g, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** ElevenLabs Agents Platform accepts 0.7–1.2. */
export function clampElevenLabsSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1;
  return Math.min(1.2, Math.max(0.7, speed));
}

/**
 * Incrementally sanitizes streamed LLM tokens for live voice playback.
 * Only emits speakable text that has not been sent yet.
 */
export class StreamingSpeechSanitizer {
  private raw = "";
  private emitted = "";

  push(chunk: string): string {
    if (!chunk) return "";
    this.raw += chunk;
    const sanitized = sanitizeForSpeech(this.raw);
    const delta = sanitized.slice(this.emitted.length);
    this.emitted = sanitized;
    return delta;
  }

  flush(): string {
    const sanitized = sanitizeForSpeech(this.raw);
    const delta = sanitized.slice(this.emitted.length);
    this.emitted = sanitized;
    return delta;
  }
}

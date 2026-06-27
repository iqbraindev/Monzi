import { generateText } from "ai";

import {
  resolveFastChatModel,
} from "@/lib/ai/openrouter";

const FALLBACK_ACKS = [
  "Sure, working on that for you now.",
  "Got it, let me take a look.",
  "Okay, I'll pull that up.",
  "On it — just a second.",
];

function pickFallback(): string {
  const line = FALLBACK_ACKS[Math.floor(Math.random() * FALLBACK_ACKS.length)];
  return line.endsWith(" ") ? line : `${line} `;
}

function normalizeSpokenLine(text: string): string {
  const trimmed = text.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return pickFallback();
  if (/[.!?]$/.test(trimmed)) return `${trimmed} `;
  return `${trimmed}. `;
}

/**
 * Short spoken line while the full agent + tools load.
 * Uses the fast model so ElevenLabs gets unique audio within ~1s.
 */
export async function generateVoiceAcknowledgment(params: {
  agentName: string;
  userMessage: string;
}): Promise<string> {
  const { agentName, userMessage } = params;

  try {
    const result = await generateText({
      model: await resolveFastChatModel(),
      system:
        `You are ${agentName} on a live voice call. ` +
        `The user just asked something. Reply with exactly ONE short spoken sentence (8–14 words) ` +
        `that naturally acknowledges their request and signals you're about to help. ` +
        `Match the topic when obvious (email, calendar, tasks, etc.). ` +
        `Sound warm and human. No markdown, bullet points, quotes, or emoji. ` +
        `Do NOT use generic phrases like "One moment, let me check that for you."`,
      prompt: userMessage,
      maxOutputTokens: 48,
      temperature: 0.85,
    });

    return normalizeSpokenLine(result.text);
  } catch {
    return pickFallback();
  }
}

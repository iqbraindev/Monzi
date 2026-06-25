import { randomUUID } from "node:crypto";

export interface OpenAIStreamChunkOptions {
  id?: string;
  model?: string;
  content?: string;
  role?: "assistant";
  finish?: boolean;
}

export function formatOpenAIChunk({
  id,
  model = "monzi",
  content,
  role,
  finish = false,
}: OpenAIStreamChunkOptions): string {
  const chunkId = id ?? `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);
  const delta: Record<string, string> = {};
  if (role) delta.role = role;
  if (content) delta.content = content;

  return `data: ${JSON.stringify({
    id: chunkId,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finish ? "stop" : null,
      },
    ],
  })}\n\n`;
}

export function openAIStreamHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

export function formatSSEKeepalive(): string {
  return ": keepalive\n\n";
}

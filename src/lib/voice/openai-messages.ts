import type { UIMessage } from "ai";

export interface OpenAIChatMessage {
  role: string;
  content?: string | null | Array<{ type?: string; text?: string }>;
}

function extractMessageText(content: OpenAIChatMessage["content"]): string {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }
  return "";
}

export function openAIMessagesToUi(
  messages: OpenAIChatMessage[]
): UIMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m, index) => ({
      id: `el-${m.role}-${index}`,
      role: m.role as "user" | "assistant",
      parts: [
        {
          type: "text" as const,
          text: extractMessageText(m.content),
        },
      ],
    }));
}

export function latestUserText(messages: OpenAIChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user") {
      const text = extractMessageText(msg.content);
      if (text) return text;
    }
  }
  return "";
}

export function uiMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** Last assistant text already stored for this exact user message, if any. */
export function findStoredAssistantReply(
  messages: UIMessage[],
  userText: string
): string | null {
  const target = userText.trim().toLowerCase();
  if (!target) return null;

  let matchedUser = false;
  let lastReply: string | null = null;

  for (const msg of messages) {
    if (msg.role === "user") {
      matchedUser = uiMessageText(msg).trim().toLowerCase() === target;
      lastReply = null;
    } else if (msg.role === "assistant" && matchedUser) {
      const text = uiMessageText(msg).trim();
      if (text) lastReply = text;
    }
  }

  return lastReply;
}

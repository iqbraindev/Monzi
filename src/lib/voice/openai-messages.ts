import type { UIMessage } from "ai";

export interface OpenAIChatMessage {
  role: string;
  content?: string | null;
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
          text: typeof m.content === "string" ? m.content : "",
        },
      ],
    }));
}

export function latestUserText(messages: OpenAIChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user" && typeof msg.content === "string") {
      return msg.content.trim();
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

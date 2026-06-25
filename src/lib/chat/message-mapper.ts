import type { UIMessage } from "ai";

export interface DbMessage {
  id: string;
  role: string;
  content: string;
  tool_calls: unknown;
  tool_results: unknown;
  created_at: string;
}

function toolNameFromCall(call: unknown): string {
  if (call && typeof call === "object" && "toolName" in call) {
    return String((call as { toolName: string }).toolName);
  }
  if (call && typeof call === "object" && "name" in call) {
    return String((call as { name: string }).name);
  }
  return "tool";
}

export function dbMessagesToUiMessages(rows: DbMessage[]): UIMessage[] {
  return rows
    .filter((row) => row.role === "user" || row.role === "assistant")
    .map((row) => {
      const parts: UIMessage["parts"] = [];

      if (row.content) {
        parts.push({ type: "text", text: row.content });
      }

      if (row.role === "assistant" && row.tool_calls) {
        const calls = Array.isArray(row.tool_calls)
          ? row.tool_calls
          : [row.tool_calls];
        const results = Array.isArray(row.tool_results)
          ? row.tool_results
          : row.tool_results
            ? [row.tool_results]
            : [];

        calls.forEach((call, i) => {
          const name = toolNameFromCall(call);
          const result = results[i];
          parts.push({
            type: `tool-${name}`,
            toolCallId: `hist-${row.id}-${i}`,
            state: "output-available",
            input: call,
            output: result ?? { ok: true },
          } as UIMessage["parts"][number]);
        });
      }

      return {
        id: row.id,
        role: row.role as "user" | "assistant",
        parts: parts.length ? parts : [{ type: "text", text: "" }],
      };
    });
}

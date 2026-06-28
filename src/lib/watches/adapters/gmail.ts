import type { WatchCandidate } from "@/lib/watches/types";

type GmailMessageRaw = {
  id?: string;
  messageId?: string;
  from?: string;
  sender?: string;
  from_email?: string;
  senderEmail?: string;
  senderName?: string;
  subject?: string;
  date?: string;
  time?: string;
  internalDate?: string;
  snippet?: string;
  payload?: { headers?: Array<{ name?: string; value?: string }> };
  headers?: Array<{ name?: string; value?: string }>;
};

function extractTimestamp(msg: GmailMessageRaw): string | null {
  const candidates = [msg.internalDate, msg.date, msg.time];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      const asNum = Number(c);
      if (!Number.isNaN(asNum) && asNum > 1_000_000_000_000) {
        return new Date(asNum).toISOString();
      }
      const parsed = new Date(c);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
  }
  return null;
}

function extractSender(msg: GmailMessageRaw): string {
  const candidates = [msg.senderName, msg.sender, msg.from, msg.from_email, msg.senderEmail];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  const headers = msg.payload?.headers ?? msg.headers ?? [];
  const fromHeader = headers.find((h) => h.name?.toLowerCase() === "from");
  return fromHeader?.value?.trim() ?? "Unknown";
}

export function adaptGmailCandidates(raw: unknown): WatchCandidate[] {
  const root = raw as {
    messages?: GmailMessageRaw[];
    data?: { messages?: GmailMessageRaw[] };
  };
  const messages = root?.messages ?? root?.data?.messages;
  if (!Array.isArray(messages)) return [];

  return messages
    .map((msg, index) => {
      const id = msg.id ?? msg.messageId ?? `gmail-${index}`;
      const subject = msg.subject?.trim() ?? "(no subject)";
      const sender = extractSender(msg);
      const snippet = msg.snippet?.trim() ?? "";
      return {
        id: String(id),
        timestamp: extractTimestamp(msg),
        title: subject,
        text: `${sender}: ${subject}${snippet ? ` — ${snippet}` : ""}`,
        metadata: { sender, subject, snippet },
      };
    })
    .filter((c) => c.id);
}

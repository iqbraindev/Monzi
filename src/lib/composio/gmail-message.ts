export interface GmailMessageDetail {
  id: string;
  from: string;
  fromRaw?: string;
  to?: string;
  subject: string;
  date: string;
  bodyText: string;
  bodyHtml?: string;
  snippet?: string;
}

type GmailPart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
};

type GmailMessagePayload = {
  headers?: Array<{ name?: string; value?: string }>;
  body?: { data?: string };
  parts?: GmailPart[];
};

type GmailMessageRaw = {
  id?: string;
  messageId?: string;
  subject?: string;
  snippet?: string;
  sender?: string;
  from?: string;
  from_email?: string;
  senderEmail?: string;
  senderName?: string;
  date?: string;
  time?: string;
  internalDate?: string;
  to?: string;
  recipient?: string;
  body?: string;
  messageText?: string;
  text?: string;
  html?: string;
  payload?: GmailMessagePayload;
  headers?: Array<{ name?: string; value?: string }>;
};

function parseEmailDisplayName(value: string): string {
  const trimmed = value.trim();
  const named = trimmed.match(/^([^<]+)</);
  if (named) {
    return named[1].trim().replace(/^["']|["']$/g, "");
  }
  if (trimmed.includes("@")) {
    const local = trimmed.split("@")[0]?.replace(/[._]/g, " ").trim();
    if (local) return local;
  }
  return trimmed;
}

function headerValue(
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string
): string | undefined {
  if (!headers) return undefined;
  const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value?.trim() || undefined;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  try {
    return Buffer.from(padded, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function collectBodies(
  payload: GmailPart | undefined,
  acc: { text?: string; html?: string }
): void {
  if (!payload) return;

  const mime = payload.mimeType?.toLowerCase() ?? "";
  const data = payload.body?.data;
  if (data) {
    const decoded = decodeBase64Url(data);
    if (mime.includes("text/html") && !acc.html) acc.html = decoded;
    if (mime.includes("text/plain") && !acc.text) acc.text = decoded;
  }

  for (const part of payload.parts ?? []) {
    collectBodies(part, acc);
  }
}

export function adaptGmailMessageDetail(raw: unknown): GmailMessageDetail | null {
  const root = raw as GmailMessageRaw & { data?: GmailMessageRaw };
  const msg = (root?.data && typeof root.data === "object" ? root.data : root) as GmailMessageRaw;

  const id = msg.messageId ?? msg.id;
  if (!id) return null;

  const headers = msg.payload?.headers ?? msg.headers;
  const fromRaw =
    msg.sender ??
    msg.from ??
    msg.from_email ??
    msg.senderEmail ??
    headerValue(headers, "From") ??
    "";
  const from = msg.senderName
    ? parseEmailDisplayName(msg.senderName)
    : parseEmailDisplayName(fromRaw || "Unknown");

  const subject =
    msg.subject ?? headerValue(headers, "Subject") ?? "(no subject)";

  const dateRaw =
    msg.date ??
    msg.time ??
    msg.internalDate ??
    headerValue(headers, "Date");
  const date = dateRaw
    ? new Date(dateRaw).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  const bodies: { text?: string; html?: string } = {};
  collectBodies(msg.payload, bodies);

  const bodyText =
    msg.body ??
    msg.messageText ??
    msg.text ??
    bodies.text ??
    msg.snippet ??
    "";
  const bodyHtml = msg.html ?? bodies.html;

  const to =
    msg.to ??
    msg.recipient ??
    headerValue(headers, "To");

  return {
    id,
    from,
    fromRaw: fromRaw || undefined,
    to,
    subject,
    date,
    bodyText,
    bodyHtml: bodyHtml || undefined,
    snippet: msg.snippet,
  };
}

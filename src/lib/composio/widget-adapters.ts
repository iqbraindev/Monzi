import type {
  CalendarEvent,
  EmailItem,
  PipelineStage,
  TaskItem,
} from "@/lib/aria/types";

const AVATAR_COLORS = [
  "#7C3AED",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#6366F1",
  "#F43F5E",
];

function colorForIndex(i: number): string {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

function initialsFromString(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (value.slice(0, 2) || "??").toUpperCase();
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yest";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

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
  unread?: boolean;
  snippet?: string;
  labelIds?: string[];
  headers?: Array<{ name?: string; value?: string }>;
  payload?: { headers?: Array<{ name?: string; value?: string }> };
};

function extractSender(msg: GmailMessageRaw): string {
  const candidates = [
    msg.senderName,
    msg.sender,
    msg.from,
    msg.from_email,
    msg.senderEmail,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      return parseEmailDisplayName(c);
    }
  }

  const headers =
    msg.payload?.headers ??
    msg.headers ??
    [];
  const fromHeader = headers.find((h) => h.name?.toLowerCase() === "from");
  if (fromHeader?.value?.trim()) {
    return parseEmailDisplayName(fromHeader.value);
  }

  return "Unknown";
}

function isUnread(msg: GmailMessageRaw): boolean {
  if (typeof msg.unread === "boolean") return msg.unread;
  if (Array.isArray(msg.labelIds)) {
    return msg.labelIds.includes("UNREAD");
  }
  return false;
}

export function adaptGmailEmails(raw: unknown): EmailItem[] {
  const root = raw as {
    messages?: GmailMessageRaw[];
    data?: { messages?: GmailMessageRaw[] };
  };

  const messages = root?.messages ?? root?.data?.messages;
  if (!Array.isArray(messages)) return [];

  return messages.map((msg, i) => {
    const name = extractSender(msg);
    const dateStr = msg.date ?? msg.time ?? msg.internalDate;
    return {
      id: msg.messageId ?? msg.id ?? String(i),
      initials: initialsFromString(name),
      color: colorForIndex(i),
      name,
      subject: msg.subject ?? msg.snippet ?? "(no subject)",
      time: formatRelativeTime(dateStr),
      unread: isUnread(msg),
    };
  });
}

export function adaptNotionTasks(raw: unknown): TaskItem[] {
  const data = raw as {
    results?: unknown[];
    tasks?: TaskItem[];
  };

  const items = data?.results ?? data?.tasks;
  if (!Array.isArray(items)) return [];

  return items.map((item, i) => {
    if (item && typeof item === "object" && "properties" in item) {
      return notionPageToTask(item as NotionPageLike, i);
    }

    const row = item as {
      id?: string;
      title?: string;
      name?: string;
      due?: string;
      due_date?: string;
      priority?: string;
      completed?: boolean;
      done?: boolean;
    };

    const dueRaw = row.due ?? row.due_date ?? "";
    const overdue =
      dueRaw &&
      new Date(dueRaw).getTime() < Date.now() &&
      !(row.completed ?? row.done);

    return {
      id: row.id ?? String(i),
      name: row.title ?? row.name ?? "Untitled task",
      due: dueRaw ? formatRelativeTime(dueRaw) || dueRaw : "No due date",
      overdue: Boolean(overdue),
      priority: (row.priority as TaskItem["priority"]) ?? "medium",
      done: Boolean(row.completed ?? row.done),
    };
  });
}

type NotionPageLike = {
  id?: string;
  properties?: Record<
    string,
    {
      type?: string;
      title?: Array<{ plain_text?: string }>;
      rich_text?: Array<{ plain_text?: string }>;
      date?: { start?: string };
      checkbox?: boolean;
      select?: { name?: string };
      status?: { name?: string };
    }
  >;
};

function notionPageToTask(page: NotionPageLike, index: number): TaskItem {
  const props = page.properties ?? {};
  let name = "Untitled task";
  let dueRaw = "";
  let done = false;
  let priority: TaskItem["priority"] = "medium";

  for (const prop of Object.values(props)) {
    if (!prop?.type) continue;
    if (prop.type === "title" && prop.title?.[0]?.plain_text) {
      name = prop.title[0].plain_text;
    } else if (prop.type === "date" && prop.date?.start) {
      dueRaw = prop.date.start;
    } else if (prop.type === "checkbox") {
      done = Boolean(prop.checkbox);
    } else if (prop.type === "select" && prop.select?.name) {
      const value = prop.select.name.toLowerCase();
      if (value.includes("high")) priority = "high";
      else if (value.includes("low")) priority = "low";
    } else if (prop.type === "status" && prop.status?.name) {
      const value = prop.status.name.toLowerCase();
      if (value.includes("done") || value.includes("complete")) done = true;
    }
  }

  const overdue =
    dueRaw && new Date(dueRaw).getTime() < Date.now() && !done;

  return {
    id: page.id ?? String(index),
    name,
    due: dueRaw ? formatRelativeTime(dueRaw) || dueRaw : "No due date",
    overdue: Boolean(overdue),
    priority,
    done,
  };
}

export function adaptCalendarEvents(raw: unknown): CalendarEvent[] {
  const data = raw as {
    items?: Array<{
      id?: string;
      summary?: string;
      title?: string;
      start?: { dateTime?: string; date?: string };
      start_time?: string;
    }>;
    events?: CalendarEvent[];
  };

  const items = (data?.items ?? data?.events) as
    | Array<{
        id?: string;
        summary?: string;
        title?: string;
        start?: { dateTime?: string; date?: string };
        start_time?: string;
      }>
    | undefined;
  if (!Array.isArray(items)) return [];

  const now = Date.now();

  return items.map((item, i) => {
    const startRaw =
      item.start?.dateTime ?? item.start?.date ?? item.start_time ?? "";
    const startMs = startRaw ? new Date(startRaw).getTime() : 0;
    const soon =
      startMs > now && startMs - now < 60 * 60 * 1000;

    return {
      id: item.id ?? String(i),
      time: startRaw
        ? new Date(startRaw).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        : "—",
      title: item.summary ?? item.title ?? "Event",
      color: colorForIndex(i),
      soon,
    };
  });
}

export function adaptStripeRevenue(raw: unknown): number[] {
  const data = raw as {
    data?: Array<{ amount?: number }>;
    transactions?: Array<{ amount?: number }>;
  };

  const rows = data?.data ?? data?.transactions;
  if (!Array.isArray(rows) || rows.length === 0) {
    return [20, 25, 22, 30, 28, 35, 40, 38, 45, 50];
  }

  const amounts = rows
    .map((r) => Math.abs(r.amount ?? 0) / 100)
    .filter((n) => n > 0);

  if (amounts.length === 0) return [20, 25, 22, 30];

  const max = Math.max(...amounts, 1);
  return amounts.map((a) => Math.round((a / max) * 100));
}

export function adaptHubSpotPipeline(raw: unknown): PipelineStage[] {
  const data = raw as {
    results?: Array<{
      id?: string;
      dealname?: string;
      dealstage?: string;
      amount?: string | number;
      properties?: { dealname?: string; dealstage?: string; amount?: string };
    }>;
    deals?: PipelineStage[];
  };

  const deals = data?.results as
    | Array<{
        id?: string;
        dealname?: string;
        dealstage?: string;
        amount?: string | number;
        properties?: { dealname?: string; dealstage?: string; amount?: string };
      }>
    | undefined;
  if (!Array.isArray(deals)) return [];

  const byStage = new Map<string, PipelineStage>();

  for (const deal of deals) {
    const stage =
      deal.dealstage ?? deal.properties?.dealstage ?? "Pipeline";
    const name = deal.dealname ?? deal.properties?.dealname ?? "Deal";
    const amount = Number(deal.amount ?? deal.properties?.amount ?? 0);

    const existing = byStage.get(stage) ?? {
      stage,
      value: "$0",
      count: 0,
      deals: [],
    };

    existing.count += 1;
    existing.deals.push({
      id: deal.id ?? name,
      name,
      color: colorForIndex(existing.deals.length),
    });

    const total = (existing.count * amount) / 1000;
    existing.value = total > 0 ? `$${Math.round(total)}k` : existing.value;
    byStage.set(stage, existing);
  }

  return Array.from(byStage.values());
}

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

export function adaptGmailEmails(raw: unknown): EmailItem[] {
  const data = raw as {
    messages?: Array<{
      id?: string;
      from?: string;
      subject?: string;
      date?: string;
      unread?: boolean;
      snippet?: string;
    }>;
    data?: { messages?: EmailItem[] };
  };

  const messages = (data?.messages ?? (data?.data as { messages?: unknown[] })?.messages) as
    | Array<{
        id?: string;
        from?: string;
        subject?: string;
        date?: string;
        unread?: boolean;
        snippet?: string;
      }>
    | undefined;
  if (!Array.isArray(messages)) return [];

  return messages.map((msg, i) => {
    const name = msg.from ?? "Unknown";
    return {
      id: msg.id ?? String(i),
      initials: initialsFromString(name),
      color: colorForIndex(i),
      name,
      subject: msg.subject ?? msg.snippet ?? "(no subject)",
      time: formatRelativeTime(msg.date),
      unread: Boolean(msg.unread),
    };
  });
}

export function adaptNotionTasks(raw: unknown): TaskItem[] {
  const data = raw as {
    results?: Array<{
      id?: string;
      title?: string;
      name?: string;
      due?: string;
      due_date?: string;
      priority?: string;
      completed?: boolean;
      done?: boolean;
    }>;
    tasks?: TaskItem[];
  };

  const items = (data?.results ?? data?.tasks) as
    | Array<{
        id?: string;
        title?: string;
        name?: string;
        due?: string;
        due_date?: string;
        priority?: string;
        completed?: boolean;
        done?: boolean;
      }>
    | undefined;
  if (!Array.isArray(items)) return [];

  return items.map((item, i) => {
    const dueRaw = item.due ?? item.due_date ?? "";
    const overdue =
      dueRaw &&
      new Date(dueRaw).getTime() < Date.now() &&
      !(item.completed ?? item.done);

    return {
      id: item.id ?? String(i),
      name: item.title ?? item.name ?? "Untitled task",
      due: dueRaw ? formatRelativeTime(dueRaw) || dueRaw : "No due date",
      overdue: Boolean(overdue),
      priority: (item.priority as TaskItem["priority"]) ?? "medium",
      done: Boolean(item.completed ?? item.done),
    };
  });
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

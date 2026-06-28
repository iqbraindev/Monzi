import type { WatchCandidate } from "@/lib/watches/types";

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return null;
}

function pickTimestamp(obj: Record<string, unknown>): string | null {
  const raw =
    pickString(obj, [
      "timestamp",
      "created_at",
      "createdAt",
      "updated_at",
      "updatedAt",
      "date",
      "time",
      "internalDate",
      "start",
      "start_time",
    ]) ?? null;
  if (!raw) return null;
  const asNum = Number(raw);
  if (!Number.isNaN(asNum) && asNum > 1_000_000_000) {
    const ms = asNum > 1_000_000_000_000 ? asNum : asNum * 1000;
    return new Date(ms).toISOString();
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function flattenItems(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  if (!raw || typeof raw !== "object") return [];

  const root = raw as Record<string, unknown>;
  const arrays = [
    root.items,
    root.results,
    root.messages,
    root.deals,
    root.events,
    root.records,
    root.data,
  ];

  for (const candidate of arrays) {
    if (Array.isArray(candidate)) {
      return candidate.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
    }
    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      for (const key of ["items", "results", "messages", "deals", "events", "records"]) {
        const arr = nested[key];
        if (Array.isArray(arr)) {
          return arr.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
        }
      }
    }
  }

  return [root];
}

export function adaptGenericCandidates(raw: unknown): WatchCandidate[] {
  return flattenItems(raw).map((item, index) => {
    const id =
      pickString(item, ["id", "messageId", "message_id", "dealId", "deal_id", "uuid"]) ??
      `item-${index}`;
    const title =
      pickString(item, ["title", "subject", "name", "dealname", "deal_name", "summary"]) ??
      "Update";
    const text =
      pickString(item, ["text", "snippet", "body", "description", "content", "message"]) ??
      JSON.stringify(item).slice(0, 500);
    return {
      id: String(id),
      timestamp: pickTimestamp(item),
      title,
      text,
      metadata: item,
    };
  });
}

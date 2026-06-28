import type { Integration } from "@/lib/aria/types";
import { getComposioApiKey } from "@/lib/composio/client";
import { TOOLKIT_CATALOG } from "@/lib/composio/toolkits";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface ComposioCatalogAppRow {
  slug: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  category: string;
  glyph: string;
  bg: string;
  fg: string;
  is_enabled: boolean;
  is_popular: boolean;
  sort_order: number;
  updated_at: string;
}

export interface ComposioSearchResult {
  slug: string;
  name: string;
  logo: string | null;
  description: string | null;
  category: string;
  noAuth: boolean;
}

const CACHE_TTL_MS = 60_000;
let enabledCache: { rows: ComposioCatalogAppRow[]; fetchedAt: number } | null =
  null;

function bustCatalogCache(): void {
  enabledCache = null;
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeCategory(raw?: string | null): string {
  if (!raw?.trim()) return "Other";
  const normalized = titleCase(raw.trim());
  const known = new Set([
    "Communication",
    "Productivity",
    "CRM",
    "Finance",
    "Analytics",
    "Development",
    "Social",
    "Storage",
    "Other",
  ]);
  if (known.has(normalized)) return normalized;

  const lower = raw.toLowerCase();
  if (lower.includes("chat") || lower.includes("email") || lower.includes("communication")) {
    return "Communication";
  }
  if (lower.includes("crm") || lower.includes("sales")) return "CRM";
  if (lower.includes("finance") || lower.includes("payment")) return "Finance";
  if (lower.includes("developer") || lower.includes("dev")) return "Development";
  if (lower.includes("analytics")) return "Analytics";
  if (lower.includes("social")) return "Social";
  if (lower.includes("storage") || lower.includes("file")) return "Storage";
  if (lower.includes("productivity") || lower.includes("project")) {
    return "Productivity";
  }
  return "Other";
}

function defaultGlyph(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

function defaultColors(slug: string): { bg: string; fg: string } {
  const catalog = TOOLKIT_CATALOG[slug];
  if (catalog) return { bg: catalog.bg, fg: catalog.fg };

  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return { bg: `hsl(${hue} 55% 42%)`, fg: "#ffffff" };
}

export function catalogRowToIntegration(
  row: ComposioCatalogAppRow,
  connected = false
): Integration {
  return {
    name: row.name,
    toolkitSlug: row.slug,
    glyph: row.glyph,
    bg: row.bg,
    fg: row.fg,
    category: row.category,
    desc: row.description ?? "",
    popular: row.is_popular,
    connected,
  };
}

export async function listCatalogApps(options?: {
  enabledOnly?: boolean;
}): Promise<ComposioCatalogAppRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("composio_catalog_apps")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (options?.enabledOnly) {
    query = query.eq("is_enabled", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ComposioCatalogAppRow[];
}

export async function listEnabledIntegrations(
  connectedSlugs: string[] = []
): Promise<Integration[]> {
  const connected = new Set(connectedSlugs);
  const now = Date.now();

  if (enabledCache && now - enabledCache.fetchedAt < CACHE_TTL_MS) {
    return enabledCache.rows.map((row) =>
      catalogRowToIntegration(row, connected.has(row.slug))
    );
  }

  const rows = await listCatalogApps({ enabledOnly: true });
  enabledCache = { rows, fetchedAt: now };

  return rows.map((row) => catalogRowToIntegration(row, connected.has(row.slug)));
}

export async function isCatalogAppEnabled(slug: string): Promise<boolean> {
  const normalized = slug.trim().toLowerCase();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("composio_catalog_apps")
    .select("is_enabled")
    .eq("slug", normalized)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data?.is_enabled);
}

export async function setCatalogAppEnabled(
  slug: string,
  enabled: boolean,
  actorId: string
): Promise<ComposioCatalogAppRow> {
  const normalized = slug.trim().toLowerCase();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("composio_catalog_apps")
    .update({
      is_enabled: enabled,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", normalized)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("App not found in catalog");
  bustCatalogCache();
  return data as ComposioCatalogAppRow;
}

export async function upsertCatalogAppFromSearch(
  result: ComposioSearchResult,
  enabled: boolean,
  actorId: string
): Promise<ComposioCatalogAppRow> {
  const slug = result.slug.trim().toLowerCase();
  const catalogMeta = TOOLKIT_CATALOG[slug];
  const colors = defaultColors(slug);

  const payload = {
    slug,
    name: result.name,
    logo_url: result.logo,
    description: result.description,
    category: catalogMeta?.category ?? normalizeCategory(result.category),
    glyph: catalogMeta?.glyph ?? defaultGlyph(result.name),
    bg: catalogMeta?.bg ?? colors.bg,
    fg: catalogMeta?.fg ?? colors.fg,
    is_enabled: enabled,
    is_popular: catalogMeta?.popular ?? false,
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("composio_catalog_apps")
    .upsert(payload, { onConflict: "slug" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  bustCatalogCache();
  return data as ComposioCatalogAppRow;
}

interface ComposioToolkitApiItem {
  slug: string;
  name: string;
  no_auth?: boolean;
  meta?: {
    description?: string;
    logo?: string;
    categories?: Array<{ name?: string; slug?: string }>;
  };
}

export async function searchComposioToolkits(
  query: string,
  limit = 24
): Promise<ComposioSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const apiKey = await getComposioApiKey();
  const params = new URLSearchParams({
    search: trimmed,
    limit: String(Math.min(Math.max(limit, 1), 50)),
    sort_by: "usage",
  });

  const res = await fetch(
    `https://backend.composio.dev/api/v3.1/toolkits?${params.toString()}`,
    {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Composio search failed (${res.status}): ${text.slice(0, 160)}`
    );
  }

  const body = (await res.json()) as { items?: ComposioToolkitApiItem[] };
  return (body.items ?? []).map((item) => ({
    slug: item.slug,
    name: item.name,
    logo: item.meta?.logo ?? null,
    description: item.meta?.description ?? null,
    category: normalizeCategory(
      item.meta?.categories?.[0]?.name ?? item.meta?.categories?.[0]?.slug
    ),
    noAuth: Boolean(item.no_auth),
  }));
}

export async function getCatalogAppMap(): Promise<
  Map<string, ComposioCatalogAppRow>
> {
  const rows = await listCatalogApps();
  return new Map(rows.map((row) => [row.slug, row]));
}

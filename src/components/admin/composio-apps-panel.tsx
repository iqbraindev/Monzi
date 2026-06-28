"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Search, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminButtonOutline,
} from "@/components/admin/admin-button-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IntegrationLogo } from "@/components/aria/integrations/integration-logo";
import type { Integration } from "@/lib/aria/types";
import type { ComposioCatalogAppRow } from "@/lib/composio/catalog";
import { cn } from "@/lib/utils";

interface SearchResult {
  slug: string;
  name: string;
  logo: string | null;
  description: string | null;
  category: string;
  noAuth: boolean;
  inCatalog: boolean;
  isEnabled: boolean;
}

async function fetchCatalogApps(): Promise<ComposioCatalogAppRow[]> {
  const res = await fetch("/api/admin/composio-apps");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load apps catalog");
  }
  const data = (await res.json()) as { apps: ComposioCatalogAppRow[] };
  return data.apps;
}

async function searchComposioApps(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `/api/admin/composio-apps/search?q=${encodeURIComponent(query)}&limit=24`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Composio search failed");
  }
  const data = (await res.json()) as { results: SearchResult[] };
  return data.results;
}

function catalogRowToIntegration(row: ComposioCatalogAppRow): Integration {
  return {
    name: row.name,
    toolkitSlug: row.slug,
    glyph: row.glyph,
    bg: row.bg,
    fg: row.fg,
    category: row.category,
    desc: row.description ?? "",
    popular: row.is_popular,
    connected: false,
  };
}

function searchResultToIntegration(result: SearchResult): Integration {
  return {
    name: result.name,
    toolkitSlug: result.slug,
    glyph: result.name.slice(0, 2).toUpperCase(),
    bg: "#444444",
    fg: "#ffffff",
    category: result.category,
    desc: result.description ?? "",
    popular: false,
    connected: false,
  };
}

function EnableToggle({
  enabled,
  pending,
  onToggle,
}: {
  enabled: boolean;
  pending: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => onToggle(!enabled)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 disabled:opacity-60",
        enabled ? "bg-emerald-500" : "bg-aria-subtle ring-1 ring-aria-border ring-inset"
      )}
      aria-pressed={enabled}
      aria-label={enabled ? "Disable app" : "Enable app"}
    >
      <span
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
          enabled ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

function AppCard({
  app,
  integration,
  enabled,
  pending,
  onToggle,
  subtitle,
}: {
  app: { slug: string; name: string; category: string; description?: string | null };
  integration: Integration;
  enabled: boolean;
  pending: boolean;
  onToggle: (next: boolean) => void;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-aria-border bg-aria-surface/70 p-4">
      <IntegrationLogo app={integration} size={42} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-aria-text">{app.name}</p>
            <p className="text-[11px] text-aria-text-secondary">
              {app.category}
              {subtitle ? ` · ${subtitle}` : ""}
            </p>
          </div>
          <EnableToggle enabled={enabled} pending={pending} onToggle={onToggle} />
        </div>
        {app.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-aria-text-secondary">
            {app.description}
          </p>
        )}
        <p className="mt-2 font-mono text-[10px] text-aria-text-muted">{app.slug}</p>
      </div>
    </div>
  );
}

export function ComposioAppsPanel() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const catalogQuery = useQuery({
    queryKey: ["admin", "composio-apps"],
    queryFn: fetchCatalogApps,
  });

  const searchQuery = useQuery({
    queryKey: ["admin", "composio-apps", "search", debouncedQuery],
    queryFn: () => searchComposioApps(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const toggleMutation = useMutation({
    mutationFn: async (payload: {
      slug: string;
      enabled: boolean;
      result?: SearchResult;
    }) => {
      const body = payload.result
        ? {
            enabled: payload.enabled,
            name: payload.result.name,
            logo: payload.result.logo,
            description: payload.result.description,
            category: payload.result.category,
          }
        : { enabled: payload.enabled };

      const res = await fetch(
        `/api/admin/composio-apps/${encodeURIComponent(payload.slug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      return data as { apps: ComposioCatalogAppRow[] };
    },
    onMutate: ({ slug }) => setPendingSlug(slug),
    onSuccess: (data) => {
      qc.setQueryData(["admin", "composio-apps"], data.apps);
      void qc.invalidateQueries({ queryKey: ["composio", "catalog"] });
      if (debouncedQuery) {
        void qc.invalidateQueries({
          queryKey: ["admin", "composio-apps", "search", debouncedQuery],
        });
      }
    },
    onSettled: () => setPendingSlug(null),
  });

  const apps = catalogQuery.data ?? [];
  const enabledCount = apps.filter((app) => app.is_enabled).length;

  const filteredCatalog = useMemo(() => {
    return apps.filter((app) => {
      if (filter === "enabled") return app.is_enabled;
      if (filter === "disabled") return !app.is_enabled;
      return true;
    });
  }, [apps, filter]);

  function handleToggle(slug: string, enabled: boolean, result?: SearchResult) {
    toggleMutation.mutate({ slug, enabled, result });
  }

  if (catalogQuery.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (catalogQuery.error) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {catalogQuery.error instanceof Error
            ? catalogQuery.error.message
            : "Failed to load apps catalog"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
      <AdminPageHeader
        icon={Smartphone}
        title="Composio Apps"
        description="Choose which integrations users can connect to their agents. Search Composio and toggle apps on or off."
        action={
          <Button
            size="sm"
            variant="outline"
            className={adminButtonOutline}
            disabled={catalogQuery.isFetching}
            onClick={() => void catalogQuery.refetch()}
          >
            {catalogQuery.isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="size-3.5" />
                Refresh
              </>
            )}
          </Button>
        }
      />

      <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
        {enabledCount} of {apps.length} apps are currently available to users.
        Disabled apps are hidden from the integrations page and agent builder.
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-aria-text-secondary uppercase">
          Search Composio
        </h2>
        <div className="mb-4 flex h-[42px] max-w-xl items-center gap-2.5 rounded-full border border-aria-border bg-aria-surface px-4">
          <Search className="size-4 text-aria-text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Gmail, Slack, HubSpot..."
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        {debouncedQuery.length >= 2 && (
          <div className="space-y-3">
            {searchQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-aria-text-muted">
                <Loader2 className="size-4 animate-spin" />
                Searching Composio…
              </div>
            ) : searchQuery.error ? (
              <p className="text-sm text-destructive">
                {searchQuery.error instanceof Error
                  ? searchQuery.error.message
                  : "Search failed"}
              </p>
            ) : (searchQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-aria-text-muted">
                No Composio apps match “{debouncedQuery}”.
              </p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {searchQuery.data?.map((result) => (
                  <AppCard
                    key={result.slug}
                    app={result}
                    integration={searchResultToIntegration(result)}
                    enabled={result.isEnabled}
                    pending={pendingSlug === result.slug}
                    subtitle={
                      result.inCatalog
                        ? result.isEnabled
                          ? "In catalog · enabled"
                          : "In catalog · disabled"
                        : "Not in catalog yet"
                    }
                    onToggle={(next) => handleToggle(result.slug, next, result)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-aria-text-secondary uppercase">
            Catalog
          </h2>
          <div className="flex gap-2">
            {(["all", "enabled", "disabled"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors",
                  filter === value
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    : "border-aria-border text-aria-text-secondary hover:text-aria-text"
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {filteredCatalog.length === 0 ? (
          <p className="text-sm text-aria-text-muted">No apps in this view.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredCatalog.map((app) => (
              <AppCard
                key={app.slug}
                app={app}
                integration={catalogRowToIntegration(app)}
                enabled={app.is_enabled}
                pending={pendingSlug === app.slug}
                onToggle={(next) => handleToggle(app.slug, next)}
              />
            ))}
          </div>
        )}
      </section>

      {toggleMutation.error && (
        <p className="mt-4 text-sm text-destructive">
          {toggleMutation.error instanceof Error
            ? toggleMutation.error.message
            : "Update failed"}
        </p>
      )}
    </div>
  );
}

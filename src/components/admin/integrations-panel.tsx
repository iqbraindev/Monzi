"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Plug, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminButtonOutline,
  adminButtonPrimary,
} from "@/components/admin/admin-button-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  IntegrationProviderStatus,
  IntegrationsOverview,
} from "@/lib/admin/types";
import { cn } from "@/lib/utils";

async function fetchIntegrations(): Promise<IntegrationsOverview> {
  const res = await fetch("/api/admin/integrations");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load integrations");
  }
  return res.json();
}

function ConnectionBadge({ connection }: { connection: { ok: boolean; error?: string } }) {
  if (connection.ok) {
    return (
      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-300 uppercase">
        Connected
      </span>
    );
  }
  return (
    <span
      className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-300 uppercase"
      title={connection.error}
    >
      {connection.error ? "Error" : "Not configured"}
    </span>
  );
}

function ProviderCard({
  provider,
  onSaved,
}: {
  provider: IntegrationProviderStatus;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/integrations/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      return data as IntegrationsOverview;
    },
    onSuccess: () => {
      setDraft({});
      onSaved();
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/integrations/${provider.id}/test`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Test failed");
      if (!data.ok) throw new Error(data.error ?? "Connection failed");
      return data;
    },
    onSuccess: () => onSaved(),
  });

  const hasDraft = Object.values(draft).some((v) => v.trim().length > 0);

  return (
    <div className="rounded-2xl border border-aria-border bg-aria-surface/70 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-lg font-semibold text-aria-text">
              {provider.label}
            </h3>
            <ConnectionBadge connection={provider.connection} />
            {!provider.editable && (
              <span className="rounded-full border border-aria-border bg-aria-subtle px-2 py-0.5 text-[10px] font-semibold tracking-wide text-aria-text-secondary uppercase">
                Deploy-time only
              </span>
            )}
          </div>
          <p className="mt-1 max-w-xl text-sm text-aria-text-secondary">
            {provider.description}
          </p>
        </div>
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300"
        >
          Docs
          <ExternalLink className="size-3" />
        </a>
      </div>

      <div className="space-y-3">
        {provider.fields.map((field) => (
          <div key={field.key}>
            <Label className="mb-1.5 block text-xs text-aria-text-secondary">
              {field.label}
              {field.configured && field.source && (
                <span className="ml-2 font-normal text-aria-text-muted">
                  ({field.source === "db" ? "saved in admin" : "from env"})
                </span>
              )}
            </Label>
            {provider.editable && field.editable ? (
              <Input
                type={field.type === "secret" ? "password" : "text"}
                placeholder={
                  field.configured
                    ? (field.maskedPreview ?? "Configured")
                    : (field.placeholder ?? `Set ${field.label.toLowerCase()}`)
                }
                value={draft[field.key] ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                className="bg-aria-elevated"
                autoComplete="off"
              />
            ) : (
              <p
                className={cn(
                  "rounded-lg border border-aria-border bg-aria-elevated px-3 py-2 text-sm",
                  field.configured ? "text-aria-text" : "text-aria-text-muted"
                )}
              >
                {field.configured
                  ? field.maskedPreview ?? "Configured"
                  : "Not configured"}
              </p>
            )}
          </div>
        ))}
      </div>

      {provider.connection.error && (
        <p className="mt-3 text-xs text-amber-400/90">{provider.connection.error}</p>
      )}

      {provider.editable && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            className={adminButtonPrimary}
            disabled={!hasDraft || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={adminButtonOutline}
            disabled={testMutation.isPending}
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="size-3.5" />
                Test connection
              </>
            )}
          </Button>
        </div>
      )}

      {(saveMutation.error || testMutation.error) && (
        <p className="mt-2 text-xs text-destructive">
          {saveMutation.error instanceof Error
            ? saveMutation.error.message
            : testMutation.error instanceof Error
              ? testMutation.error.message
              : "Request failed"}
        </p>
      )}
    </div>
  );
}

export function IntegrationsPanel() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: fetchIntegrations,
  });

  const editableProviders = useMemo(() => data?.providers ?? [], [data]);
  const infrastructure = useMemo(() => data?.infrastructure ?? [], [data]);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["admin", "integrations"] });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load integrations"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
      <AdminPageHeader
        icon={Plug}
        title="Integrations"
        description="Manage third-party API keys and connection settings. Secrets saved here override .env at runtime."
        action={
          <Button
            size="sm"
            variant="outline"
            className={adminButtonOutline}
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? (
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
        Infrastructure keys (<code className="text-amber-200">NEXT_PUBLIC_*</code>, Supabase,
        Redis) must be set via deploy environment variables. Editable secrets are encrypted in
        the database using <code className="text-amber-200">PLATFORM_SECRETS_ENCRYPTION_KEY</code>.
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-aria-text-secondary uppercase">
          Runtime integrations
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {editableProviders.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} onSaved={invalidate} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-aria-text-secondary uppercase">
          Infrastructure status
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {infrastructure.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} onSaved={invalidate} />
          ))}
        </div>
      </section>
    </div>
  );
}

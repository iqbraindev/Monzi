"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Package } from "lucide-react";
import { useState } from "react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminButtonOutline,
  adminButtonPrimary,
} from "@/components/admin/admin-button-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Pack, PackLimits } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

async function fetchAdminPacks(): Promise<Pack[]> {
  const res = await fetch("/api/admin/packs");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load packs");
  }
  const data = (await res.json()) as { packs: Pack[] };
  return data.packs;
}

const EMPTY_LIMITS: PackLimits = {
  max_workspaces: 1,
  max_agents: 1,
  max_subaccounts: 0,
  ai_messages_per_month: 50,
  ai_messages_per_day: 10,
  max_dashboards: 1,
  max_widgets_per_dashboard: 5,
  max_integrations: 1,
  voice_enabled: false,
  custom_avatar_enabled: false,
  storage_mb: 100,
  agent_energy_default: 25_000,
  agent_energy_max: 50_000,
  support_level: "community",
};

export function PacksManager() {
  const qc = useQueryClient();
  const { data: packs = [], isLoading, error } = useQuery({
    queryKey: ["admin", "packs"],
    queryFn: fetchAdminPacks,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Pack> & { limits?: PackLimits }>(
    {}
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      body: Record<string, unknown>;
    }) => {
      const url = payload.id
        ? `/api/admin/packs/${payload.id}`
        : "/api/admin/packs";
      const res = await fetch(url, {
        method: payload.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      return data as { packs: Pack[] };
    },
    onSuccess: (data) => {
      qc.setQueryData(["admin", "packs"], data.packs);
      setEditingId(null);
      setDraft({});
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/packs/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Deactivate failed");
      return data as { packs: Pack[] };
    },
    onSuccess: (data) => {
      qc.setQueryData(["admin", "packs"], data.packs);
    },
  });

  function startEdit(pack: Pack) {
    setEditingId(pack.id);
    setDraft({ ...pack, limits: pack.limits ?? EMPTY_LIMITS });
  }

  function startCreate() {
    setEditingId("new");
    setDraft({
      name: "",
      slug: "",
      description: "",
      price_monthly: 0,
      price_yearly: 0,
      is_active: true,
      is_public: true,
      sort_order: packs.length,
      limits: { ...EMPTY_LIMITS },
    });
  }

  function updateDraft(field: string, value: unknown) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function updateLimit(field: keyof PackLimits, value: unknown) {
    setDraft((prev) => ({
      ...prev,
      limits: { ...(prev.limits ?? EMPTY_LIMITS), [field]: value },
    }));
  }

  function handleSave() {
    const body = {
      name: draft.name,
      slug: draft.slug,
      description: draft.description,
      price_monthly: Number(draft.price_monthly ?? 0),
      price_yearly: Number(draft.price_yearly ?? 0),
      stripe_price_id_monthly: draft.stripe_price_id_monthly,
      stripe_price_id_yearly: draft.stripe_price_id_yearly,
      is_active: draft.is_active,
      is_public: draft.is_public,
      sort_order: Number(draft.sort_order ?? 0),
      limits: draft.limits,
    };

    saveMutation.mutate({
      id: editingId === "new" ? undefined : (editingId ?? undefined),
      body,
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-aria-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load packs"}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
      <AdminPageHeader
        icon={Package}
        title="Package management"
        description="Create and edit subscription packs, pricing, Stripe price IDs, and usage limits."
        action={
          <Button
            className={cn("rounded-full", adminButtonPrimary)}
            onClick={startCreate}
          >
            <Plus className="size-4" />
            New pack
          </Button>
        }
      />

      {(editingId === "new" || editingId) && (
        <div className="mb-6 rounded-2xl border border-aria-border bg-aria-surface/70 p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-aria-text">
            {editingId === "new" ? "Create pack" : "Edit pack"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name">
              <Input
                value={draft.name ?? ""}
                onChange={(e) => updateDraft("name", e.target.value)}
              />
            </Field>
            <Field label="Slug">
              <Input
                value={draft.slug ?? ""}
                onChange={(e) => updateDraft("slug", e.target.value)}
              />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={draft.sort_order ?? 0}
                onChange={(e) => updateDraft("sort_order", e.target.value)}
              />
            </Field>
            <Field label="Monthly price ($)">
              <Input
                type="number"
                value={draft.price_monthly ?? 0}
                onChange={(e) => updateDraft("price_monthly", e.target.value)}
              />
            </Field>
            <Field label="Yearly price ($)">
              <Input
                type="number"
                value={draft.price_yearly ?? 0}
                onChange={(e) => updateDraft("price_yearly", e.target.value)}
              />
            </Field>
            <Field label="Support level">
              <Input
                value={draft.limits?.support_level ?? "community"}
                onChange={(e) => updateLimit("support_level", e.target.value)}
              />
            </Field>
            <Field label="Stripe price ID (monthly)">
              <Input
                value={draft.stripe_price_id_monthly ?? ""}
                onChange={(e) =>
                  updateDraft("stripe_price_id_monthly", e.target.value)
                }
              />
            </Field>
            <Field label="Stripe price ID (yearly)">
              <Input
                value={draft.stripe_price_id_yearly ?? ""}
                onChange={(e) =>
                  updateDraft("stripe_price_id_yearly", e.target.value)
                }
              />
            </Field>
            <Field label="Max workspaces (-1 = unlimited)">
              <Input
                type="number"
                value={draft.limits?.max_workspaces ?? 1}
                onChange={(e) =>
                  updateLimit("max_workspaces", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Max agents (-1 = unlimited)">
              <Input
                type="number"
                value={draft.limits?.max_agents ?? 1}
                onChange={(e) =>
                  updateLimit("max_agents", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Messages / month">
              <Input
                type="number"
                value={draft.limits?.ai_messages_per_month ?? 50}
                onChange={(e) =>
                  updateLimit("ai_messages_per_month", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Max integrations">
              <Input
                type="number"
                value={draft.limits?.max_integrations ?? 1}
                onChange={(e) =>
                  updateLimit("max_integrations", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Energy default / agent">
              <Input
                type="number"
                value={draft.limits?.agent_energy_default ?? 25_000}
                onChange={(e) =>
                  updateLimit("agent_energy_default", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Energy max / agent">
              <Input
                type="number"
                value={draft.limits?.agent_energy_max ?? 50_000}
                onChange={(e) =>
                  updateLimit("agent_energy_max", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Storage (MB)">
              <Input
                type="number"
                value={draft.limits?.storage_mb ?? 100}
                onChange={(e) =>
                  updateLimit("storage_mb", Number(e.target.value))
                }
              />
            </Field>
            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
              <label className="flex items-center gap-2 text-sm text-aria-text">
                <input
                  type="checkbox"
                  checked={draft.limits?.voice_enabled ?? false}
                  onChange={(e) => updateLimit("voice_enabled", e.target.checked)}
                />
                Voice enabled
              </label>
              <label className="flex items-center gap-2 text-sm text-aria-text">
                <input
                  type="checkbox"
                  checked={draft.limits?.custom_avatar_enabled ?? false}
                  onChange={(e) =>
                    updateLimit("custom_avatar_enabled", e.target.checked)
                  }
                />
                Custom avatars
              </label>
              <label className="flex items-center gap-2 text-sm text-aria-text">
                <input
                  type="checkbox"
                  checked={draft.is_public ?? true}
                  onChange={(e) => updateDraft("is_public", e.target.checked)}
                />
                Public (visible on billing page)
              </label>
              <label className="flex items-center gap-2 text-sm text-aria-text">
                <input
                  type="checkbox"
                  checked={draft.is_active ?? true}
                  onChange={(e) => updateDraft("is_active", e.target.checked)}
                />
                Active
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              className={cn("rounded-full", adminButtonPrimary)}
              disabled={saveMutation.isPending}
              onClick={handleSave}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
            <Button
              variant="outline"
              className={cn("rounded-full", adminButtonOutline)}
              onClick={() => {
                setEditingId(null);
                setDraft({});
              }}
            >
              Cancel
            </Button>
          </div>
          {saveMutation.isError && (
            <p className="mt-2 text-sm text-destructive">
              {saveMutation.error.message}
            </p>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-aria-border bg-aria-surface/70">
        <div className="grid grid-cols-[1fr_0.6fr_0.6fr_0.8fr_120px] gap-3 border-b border-aria-border bg-[#16161f] px-4 py-3 text-[11px] font-semibold tracking-wide text-aria-text-secondary uppercase">
          <span>Pack</span>
          <span>Monthly</span>
          <span>Yearly</span>
          <span>Status</span>
          <span />
        </div>
        {packs.map((pack) => (
          <div
            key={pack.id}
            className="grid grid-cols-[1fr_0.6fr_0.6fr_0.8fr_120px] items-center gap-3 border-b border-[#16161f] px-4 py-3.5"
          >
            <div>
              <p className="text-sm font-medium text-aria-text">{pack.name}</p>
              <p className="text-xs text-aria-text-secondary">{pack.slug}</p>
            </div>
            <span className="font-mono text-sm text-aria-text">
              ${Number(pack.price_monthly).toFixed(0)}
            </span>
            <span className="font-mono text-sm text-aria-text">
              ${Number(pack.price_yearly).toFixed(0)}
            </span>
            <span className="text-xs text-aria-text-secondary">
              {pack.is_active ? (pack.is_public ? "Public" : "Hidden") : "Inactive"}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className={cn("rounded-full", adminButtonOutline)}
                onClick={() => startEdit(pack)}
              >
                Edit
              </Button>
              {pack.slug !== "free" && pack.is_active && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-full"
                  disabled={deactivateMutation.isPending}
                  onClick={() => deactivateMutation.mutate(pack.id)}
                >
                  Hide
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-aria-text-secondary">{label}</Label>
      {children}
    </div>
  );
}

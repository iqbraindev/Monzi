"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Pause, Play, Trash2 } from "lucide-react";

import type { DbAgentWatch } from "@/lib/watches/types";
import { useLimits } from "@/hooks/use-workspaces";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  needs_connection: "Needs app",
  expired: "Expired",
};

export default function WatchesPage() {
  const { data: limitsData } = useLimits();
  const workspaceId = limitsData?.workspaceId as string | undefined;
  const [watches, setWatches] = useState<DbAgentWatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/watches", {
        headers: { "x-monzi-workspace-id": workspaceId },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load watches");
      }
      const data = (await res.json()) as { watches: DbAgentWatch[] };
      setWatches(data.watches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watches");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchStatus(id: string, status: "active" | "paused") {
    if (!workspaceId) return;
    const res = await fetch(`/api/watches/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-monzi-workspace-id": workspaceId,
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      alert(body.error ?? "Failed to update watch");
      return;
    }
    void load();
  }

  async function remove(id: string) {
    if (!workspaceId) return;
    if (!window.confirm("Delete this watch?")) return;
    await fetch(`/api/watches/${id}`, {
      method: "DELETE",
      headers: { "x-monzi-workspace-id": workspaceId },
    });
    void load();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-aria-primary/15 text-aria-primary-light">
          <Eye className="size-5" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-aria-text">Watches</h1>
          <p className="text-sm text-aria-text-secondary">
            Standing orders your agents monitor across connected apps.
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-aria-text-muted">Loading watches…</p>
      )}
      {error && <p className="text-sm text-aria-rose">{error}</p>}

      {!loading && watches.length === 0 && (
        <div className="rounded-2xl border border-aria-border bg-aria-surface/60 px-6 py-10 text-center">
          <p className="text-[15px] font-medium text-aria-text">No watches yet</p>
          <p className="mt-1 text-sm text-aria-text-secondary">
            Tell an agent: &quot;Watch if a lead emails about our product&quot; to create one.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {watches.map((watch) => (
          <li
            key={watch.id}
            className="rounded-2xl border border-aria-border bg-aria-surface/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-aria-text">{watch.title}</p>
                <p className="mt-0.5 text-sm text-aria-text-secondary">{watch.condition_nl}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full bg-aria-subtle px-2 py-0.5 font-medium text-aria-text-secondary">
                    {watch.toolkit}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-medium",
                      watch.status === "active"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-aria-subtle text-aria-text-muted"
                    )}
                  >
                    {STATUS_LABEL[watch.status] ?? watch.status}
                  </span>
                  {watch.last_checked_at && (
                    <span className="text-aria-text-muted">
                      Last checked {new Date(watch.last_checked_at).toLocaleString()}
                    </span>
                  )}
                </div>
                {watch.last_error && (
                  <p className="mt-2 text-xs text-aria-rose">{watch.last_error}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {watch.status === "active" ? (
                  <button
                    type="button"
                    title="Pause"
                    onClick={() => void patchStatus(watch.id, "paused")}
                    className="flex size-8 items-center justify-center rounded-lg text-aria-text-muted hover:bg-aria-subtle hover:text-aria-text"
                  >
                    <Pause className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Resume"
                    onClick={() => void patchStatus(watch.id, "active")}
                    className="flex size-8 items-center justify-center rounded-lg text-aria-text-muted hover:bg-aria-subtle hover:text-aria-text"
                  >
                    <Play className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  title="Delete"
                  onClick={() => void remove(watch.id)}
                  className="flex size-8 items-center justify-center rounded-lg text-aria-text-muted hover:bg-aria-rose/10 hover:text-aria-rose"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

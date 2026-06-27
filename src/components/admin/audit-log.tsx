"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, ScrollText } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { AuditLogEntry } from "@/lib/admin/types";

async function fetchAuditLog(): Promise<AuditLogEntry[]> {
  const res = await fetch("/api/admin/audit");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load audit log");
  }
  const data = (await res.json()) as { entries: AuditLogEntry[] };
  return data.entries;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditLogPanel() {
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: fetchAuditLog,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
      <AdminPageHeader
        icon={ScrollText}
        title="Audit log"
        description="Track admin actions across packages, users, and platform settings."
      />

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load audit log"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-aria-border bg-aria-surface/70">
          {entries.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-aria-text-secondary">
              No audit events recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-[#16161f]">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-aria-text">
                      <span className="font-mono text-amber-300/90">
                        {entry.action}
                      </span>
                      {entry.target_type && (
                        <span className="text-aria-text-secondary">
                          {" "}
                          on {entry.target_type}
                          {entry.target_id ? ` · ${entry.target_id.slice(0, 8)}…` : ""}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-aria-text-muted">
                      by {entry.actor_email ?? entry.actor_id ?? "system"}
                    </p>
                  </div>
                  <time className="text-xs text-aria-text-secondary">
                    {formatWhen(entry.created_at)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

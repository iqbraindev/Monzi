"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminButtonOutline,
  adminButtonPrimary,
} from "@/components/admin/admin-button-styles";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AdminUserRow } from "@/lib/admin/types";
import type { Pack } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

async function fetchUsers(search: string): Promise<AdminUserRow[]> {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  const res = await fetch(`/api/admin/users?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load users");
  }
  const data = (await res.json()) as { users: AdminUserRow[] };
  return data.users;
}

async function fetchPacks(): Promise<Pack[]> {
  const res = await fetch("/api/admin/packs");
  if (!res.ok) throw new Error("Failed to load packs");
  const data = (await res.json()) as { packs: Pack[] };
  return data.packs;
}

export function UsersTable() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [userToDelete, setUserToDelete] = useState<AdminUserRow | null>(null);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin", "users", query],
    queryFn: () => fetchUsers(query),
  });

  const { data: packs = [] } = useQuery({
    queryKey: ["admin", "packs"],
    queryFn: fetchPacks,
  });

  const packBySlug = useMemo(
    () => new Map(packs.map((p) => [p.slug, p])),
    [packs]
  );

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      return data as { user: AdminUserRow };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      return data as { success: boolean; email: string };
    },
    onSuccess: () => {
      setUserToDelete(null);
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      void qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });

  return (
    <div className="mx-auto w-full max-w-[1200px] px-7 pt-7 pb-12">
      <AdminPageHeader
        icon={Users}
        title="User management"
        description="Search accounts, review plans, suspend access, adjust subscriptions, or permanently delete suspended users."
      />

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-aria-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="pl-9"
          />
        </div>
        <Button type="submit" className={cn("rounded-full", adminButtonPrimary)}>
          Search
        </Button>
      </form>

      {isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-amber-400" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load users"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-aria-border bg-aria-surface/70">
          <div className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.5fr_0.5fr_180px] gap-3 border-b border-aria-border bg-[#16161f] px-4 py-3 text-[11px] font-semibold tracking-wide text-aria-text-secondary uppercase">
            <span>User</span>
            <span>Plan</span>
            <span>Status</span>
            <span>Agents</span>
            <span>Msgs / mo</span>
            <span />
          </div>
          {users.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-aria-text-secondary">
              No users found.
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.5fr_0.5fr_180px] items-center gap-3 border-b border-[#16161f] px-4 py-3.5"
              >
                <div>
                  <p className="text-sm font-medium text-aria-text">
                    {user.full_name || "Unnamed user"}
                  </p>
                  <p className="text-xs text-aria-text-muted">{user.email}</p>
                  <p className="text-[10px] text-aria-text-muted capitalize">
                    {user.role.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-aria-text">
                    {user.pack_name ?? "Free"}
                  </p>
                  <select
                    className="mt-1 h-8 w-full rounded-lg border border-aria-border bg-aria-base px-2 text-xs text-aria-text"
                    value={user.pack_slug ?? "free"}
                    onChange={(e) => {
                      const pack = packBySlug.get(e.target.value);
                      if (!pack) return;
                      updateMutation.mutate({
                        id: user.id,
                        body: { pack_id: pack.id },
                      });
                    }}
                  >
                    {packs
                      .filter((p) => p.is_active)
                      .map((pack) => (
                        <option key={pack.id} value={pack.slug}>
                          {pack.name}
                        </option>
                      ))}
                  </select>
                </div>
                <StatusBadge user={user} />
                <span className="font-mono text-sm text-aria-text">
                  {user.agents_count}
                </span>
                <span className="font-mono text-sm text-aria-text">
                  {user.ai_messages_used}
                </span>
                <div className="flex flex-col gap-1.5">
                  <Button
                    size="sm"
                    variant={user.is_suspended ? "outline" : "destructive"}
                    className={cn(
                      "rounded-full",
                      user.is_suspended ? adminButtonOutline : undefined
                    )}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: user.id,
                        body: { is_suspended: !user.is_suspended },
                      })
                    }
                  >
                    {user.is_suspended ? "Restore" : "Suspend"}
                  </Button>
                  {user.is_suspended ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full"
                      disabled={deleteMutation.isPending}
                      onClick={() => setUserToDelete(user)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog
        open={userToDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setUserToDelete(null);
        }}
      >
        <DialogContent className="border-aria-border bg-aria-surface text-aria-text">
          <DialogHeader>
            <DialogTitle>Permanently delete user?</DialogTitle>
            <DialogDescription className="text-aria-text-secondary">
              This will permanently delete{" "}
              <span className="font-medium text-aria-text">
                {userToDelete?.email}
              </span>{" "}
              and all related data — workspaces, agents, conversations,
              dashboards, integrations, billing records, and subaccounts. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.error ? (
            <p className="text-sm text-destructive">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : "Delete failed"}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              className={adminButtonOutline}
              disabled={deleteMutation.isPending}
              onClick={() => setUserToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (userToDelete) deleteMutation.mutate(userToDelete.id);
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete permanently"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ user }: { user: AdminUserRow }) {
  if (user.is_suspended) {
    return (
      <span className="inline-flex rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300">
        Suspended
      </span>
    );
  }
  if (!user.is_active) {
    return (
      <span className="inline-flex rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs font-medium text-zinc-300">
        Inactive
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
      {user.subscription_status ?? "active"}
    </span>
  );
}

"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Check, ChevronDown, Plus } from "lucide-react";

import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { getUserDisplayName } from "@/lib/clerk/user-profile";
import { cn } from "@/lib/utils";
import type { WorkspaceWithRole } from "@/lib/workspaces/types";
import { useSwitchWorkspace, useLimits, useWorkspaces } from "@/hooks/use-workspaces";

function workspaceLogoSrc(workspace: WorkspaceWithRole): string | null {
  if (!workspace.logo_url) return null;
  return `${workspace.logo_url}?v=${encodeURIComponent(workspace.updated_at)}`;
}

function WorkspaceAvatar({
  workspace,
  fallback,
  className,
}: {
  workspace?: WorkspaceWithRole;
  fallback: string;
  className?: string;
}) {
  const logoSrc = workspace ? workspaceLogoSrc(workspace) : null;

  if (logoSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoSrc}
        alt={workspace?.name ?? "Workspace"}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white",
        className
      )}
      style={{ background: "linear-gradient(135deg, #6366F1, #06B6D4)" }}
    >
      {fallback}
    </span>
  );
}

export function WorkspaceSwitcher({ expanded }: { expanded: boolean }) {
  const { user } = useUser();
  const { data, isLoading } = useWorkspaces();
  const { data: limitsData } = useLimits();
  const switchWorkspace = useSwitchWorkspace();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const workspaces = data?.workspaces ?? [];
  const activeWorkspaceId = limitsData?.workspaceId as string | undefined;
  const active =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];

  const displayName = user ? getUserDisplayName(user) : "Account";
  const workspaceInitials = (active?.name ?? "W").slice(0, 1).toUpperCase();
  const workspaceName = active?.name ?? "My Workspace";

  if (!expanded) {
    return (
      <button
        type="button"
        title={workspaceName}
        onClick={() => setOpen((o) => !o)}
        className="mx-auto flex size-8 items-center justify-center"
      >
        <WorkspaceAvatar
          workspace={active}
          fallback={workspaceInitials}
          className="size-8"
        />
      </button>
    );
  }

  return (
    <>
      <div className="relative px-3.5 pt-4 pb-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-transparent p-1 text-left transition-colors hover:border-aria-border hover:bg-aria-elevated"
        >
          <WorkspaceAvatar
            workspace={active}
            fallback={workspaceInitials}
            className="size-8"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-semibold text-aria-text">
              {isLoading ? "Loading..." : workspaceName}
            </span>
            <span className="truncate text-[11px] text-aria-text-secondary">
              {active?.activity_domain ?? displayName}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-aria-text-secondary transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="aria-pop absolute top-[52px] right-3.5 left-3.5 z-50 rounded-[14px] border border-aria-border bg-aria-elevated p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
            <div className="px-2.5 pt-2 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
              Workspaces
            </div>
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                disabled={switchWorkspace.isPending}
                onClick={() => {
                  setOpen(false);
                  if (workspace.id !== active?.id) {
                    switchWorkspace.mutate(workspace.id);
                  }
                }}
                className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition-colors hover:bg-aria-subtle"
              >
                <WorkspaceAvatar
                  workspace={workspace}
                  fallback={workspace.name.slice(0, 1).toUpperCase()}
                  className="size-7"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-semibold text-aria-text">
                    {workspace.name}
                  </span>
                  <span className="truncate text-[11px] capitalize text-aria-text-secondary">
                    {workspace.activity_domain ?? workspace.member_role}
                  </span>
                </span>
                {workspace.id === active?.id && (
                  <Check className="size-4 text-aria-primary-light" />
                )}
              </button>
            ))}
            <div className="my-1 h-px bg-aria-border-subtle" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCreateOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-[13px] font-medium text-aria-primary-light transition-colors hover:bg-aria-subtle"
            >
              <Plus className="size-4" />
              Create workspace
            </button>
          </div>
        )}
      </div>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

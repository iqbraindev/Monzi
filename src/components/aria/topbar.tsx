"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { Menu, Search, Bell, ChevronDown, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui-store";
import { AGENTS, getAgent } from "@/lib/aria/mock-data";
import { AgentAvatar } from "@/components/aria/agent-avatar";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

function AgentSwitcher() {
  const activeAgentId = useUIStore((s) => s.activeAgentId);
  const setActiveAgent = useUIStore((s) => s.setActiveAgent);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const agent = getAgent(activeAgentId ?? "nova");

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-[38px] items-center gap-2 rounded-full border border-aria-border bg-aria-surface py-0 pr-2 pl-1.5 transition-colors hover:border-aria-border hover:bg-aria-elevated"
      >
        <AgentAvatar
          assetId={agent.avatarAssetId}
          color={agent.color}
          size={26}
          alt={agent.name}
        />
        <span className="text-[13px] font-semibold text-aria-text">
          {agent.name}
        </span>
        <ChevronDown className="size-3.5 text-aria-text-secondary" />
      </button>

      {open && (
        <div className="aria-pop absolute top-[46px] right-0 z-40 w-60 rounded-[14px] border border-aria-border bg-aria-elevated p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          <div className="px-2.5 pt-2 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
            Switch agent
          </div>
          {AGENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setActiveAgent(a.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition-colors hover:bg-aria-subtle"
            >
              <AgentAvatar
                assetId={a.avatarAssetId}
                color={a.color}
                size={28}
                alt={a.name}
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold text-aria-text">
                  {a.name}
                </span>
                <span className="text-[11px] text-aria-text-secondary">
                  {a.role}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "Account";
  const email = user?.primaryEmailAddress?.emailAddress;
  const initials = getInitials(displayName);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex size-[34px] items-center justify-center rounded-full border border-aria-border text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #6366F1, #06B6D4)" }}
      >
        {user?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.imageUrl}
            alt={displayName}
            className="size-full rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="aria-pop absolute top-[42px] right-0 z-40 w-56 rounded-[14px] border border-aria-border bg-aria-elevated p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          <div className="px-2.5 py-2">
            <p className="truncate text-[13px] font-semibold text-aria-text">
              {displayName}
            </p>
            {email && (
              <p className="truncate text-[11px] text-aria-text-secondary">
                {email}
              </p>
            )}
          </div>
          <div className="my-1 h-px bg-aria-border-subtle" />
          <button
            onClick={() => {
              setOpen(false);
              void signOut({ redirectUrl: "/sign-in" });
            }}
            className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] font-medium text-aria-text transition-colors hover:bg-aria-subtle"
          >
            <LogOut className="size-4 text-aria-text-secondary" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-4 border-b border-aria-border-subtle bg-aria-base/85 px-4 backdrop-blur-md">
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="flex size-[34px] items-center justify-center rounded-lg text-aria-text-secondary transition-colors hover:bg-aria-subtle hover:text-aria-text"
        >
          <Menu className="size-[18px]" />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="aria-gradient aria-breathe size-6 rounded-full shadow-[0_0_16px_rgba(124,58,237,0.55)]" />
          <span className="font-heading text-lg font-bold tracking-[0.04em] text-aria-text">
            Monzi
          </span>
        </div>
      </div>

      {/* Command bar */}
      <div className="flex min-w-0 flex-1 justify-center">
        <button
          onClick={() => setCommandOpen(true)}
          className={cn(
            "flex h-[38px] w-full max-w-[520px] cursor-text items-center gap-2.5 rounded-full border border-aria-border bg-aria-surface px-3.5 text-sm text-aria-text-muted transition-all",
            "hover:shadow-[0_0_0_3px_rgba(124,58,237,0.12)]"
          )}
        >
          <Search className="size-4 text-aria-text-muted" />
          <span className="flex-1 text-left">Ask Monzi or search...</span>
          <span className="rounded-[5px] border border-aria-border px-1.5 py-0.5 font-mono text-[11px] text-aria-text-muted">
            ⌘K
          </span>
        </button>
      </div>

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-2">
        <AgentSwitcher />
        <button
          aria-label="Notifications"
          className="relative flex size-[38px] items-center justify-center rounded-full border border-aria-border bg-aria-surface text-aria-text-secondary transition-colors hover:bg-aria-elevated hover:text-aria-text"
        >
          <Bell className="size-[17px]" />
          <span className="absolute top-2 right-[9px] size-[7px] rounded-full border-[1.5px] border-aria-base bg-aria-rose" />
        </button>
        <ProfileMenu />
      </div>
    </header>
  );
}

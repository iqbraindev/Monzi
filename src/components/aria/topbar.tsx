"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { Menu, Search, LogOut } from "lucide-react";

import { NotificationBell } from "@/components/aria/notifications/notification-bell";

import { MonziLogo, MONZI_LOGO_APP_STYLE } from "@/components/brand/monzi-logo";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui-store";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
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
        <MonziLogo href="/dashboard" style={MONZI_LOGO_APP_STYLE} />
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
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}

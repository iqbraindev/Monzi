"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { Menu, Shield, LogOut, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui-store";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

function AdminProfileMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "Super Admin";
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
        aria-label="Admin account menu"
        aria-expanded={open}
        className="flex h-[34px] items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 py-0 pr-2 pl-1.5 transition-colors hover:bg-amber-500/15"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-semibold text-amber-200">
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
        </span>
        <span className="hidden text-[13px] font-semibold text-amber-100 sm:inline">
          Super Admin
        </span>
        <ChevronDown className="size-3.5 text-amber-300/70" />
      </button>

      {open && (
        <div className="aria-pop absolute top-[42px] right-0 z-40 w-60 rounded-[14px] border border-amber-500/20 bg-aria-elevated p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          <div className="px-2.5 py-2">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-400">
              <Shield className="size-3" />
              Platform owner
            </div>
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

export function AdminTopbar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-4 border-b border-amber-500/15 bg-[#0a0a0f]/90 px-4 backdrop-blur-md">
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="flex size-[34px] items-center justify-center rounded-lg text-aria-text-secondary transition-colors hover:bg-aria-subtle hover:text-aria-text"
        >
          <Menu className="size-[18px]" />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
            <Shield className="size-3.5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-[0.04em] text-aria-text">
            Monzi Admin
          </span>
          <span
            className={cn(
              "hidden rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-300 uppercase sm:inline"
            )}
          >
            Super Admin
          </span>
        </div>
      </div>

      <div className="flex-1" />

      <AdminProfileMenu />
    </header>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { useNotifications } from "@/hooks/use-realtime-notifications";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex size-[38px] items-center justify-center rounded-full border border-aria-border bg-aria-surface text-aria-text-secondary transition-colors hover:bg-aria-elevated hover:text-aria-text"
      >
        <Bell className="size-[17px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-aria-rose px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="aria-pop absolute top-[46px] right-0 z-40 w-[360px] overflow-hidden rounded-[14px] border border-aria-border bg-aria-elevated shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-aria-border-subtle px-3 py-2.5">
            <p className="text-[13px] font-semibold text-aria-text">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="flex items-center gap-1 text-[11px] font-medium text-aria-primary-light hover:underline"
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-aria-text-muted">
                No notifications yet. Ask an agent to watch something for you.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.read_at) void markRead(n.id);
                  }}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-aria-border-subtle px-3 py-2.5 text-left transition-colors hover:bg-aria-subtle",
                    !n.read_at && "bg-aria-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-aria-text">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-aria-text-muted">
                      {formatWhen(n.created_at)}
                    </span>
                  </div>
                  <p className="text-[12px] leading-snug text-aria-text-secondary">{n.body}</p>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-aria-border-subtle px-3 py-2">
            <Link
              href="/watches"
              onClick={() => setOpen(false)}
              className="text-[12px] font-medium text-aria-primary-light hover:underline"
            >
              Manage watches
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

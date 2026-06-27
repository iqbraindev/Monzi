"use client";

import Link from "next/link";

import type { LimitExceededError } from "@/lib/workspaces/types";

export function UpgradePrompt({
  error,
  open,
  onOpenChange,
}: {
  error: LimitExceededError;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-aria-border bg-aria-elevated p-6 shadow-xl">
        <h2 className="font-heading text-lg font-semibold text-aria-text">
          Plan limit reached
        </h2>
        <p className="mt-2 text-sm text-aria-text-secondary">{error.error}</p>
        <p className="mt-1 font-mono text-xs text-aria-text-muted">
          {error.current} / {error.max < 0 ? "∞" : error.max}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-full px-4 text-[13px] font-semibold text-aria-text-secondary hover:bg-aria-subtle"
          >
            Close
          </button>
          <Link
            href="/billing"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center rounded-full bg-aria-primary px-4 text-[13px] font-semibold text-white"
          >
            Upgrade plan
          </Link>
        </div>
      </div>
    </div>
  );
}

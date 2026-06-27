"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { PlanCard } from "@/components/billing/plan-card";
import { Button } from "@/components/ui/button";
import { useCheckout } from "@/hooks/use-billing";
import type { Pack } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

interface PlanPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSlug: string;
  packs: Pack[];
}

const POPULAR_SLUG = "pro";

export function PlanPickerDialog({
  open,
  onOpenChange,
  currentSlug,
  packs,
}: PlanPickerDialogProps) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const checkout = useCheckout();
  const [selectingSlug, setSelectingSlug] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const sortedPacks = [...packs].sort((a, b) => a.sort_order - b.sort_order);

  function handleSelect(pack: Pack) {
    if (pack.slug === "free" || pack.slug === currentSlug) return;
    setSelectingSlug(pack.slug);
    checkout.mutate(
      { plan: pack.slug, cycle },
      { onSettled: () => setSelectingSlug(null) }
    );
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close plan picker"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Scroll container — centers panel in viewport */}
      <div className="relative flex h-full w-full justify-center overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-picker-title"
          className="relative my-auto w-full max-w-[1360px] shrink-0 rounded-2xl border border-aria-border bg-[#0c0c10] shadow-2xl shadow-black/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-4 right-4 z-10 rounded-full text-aria-text-secondary hover:text-aria-text"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </Button>

          {/* Header */}
          <div className="border-b border-aria-border px-6 py-6 sm:px-8 sm:py-7">
            <h2
              id="plan-picker-title"
              className="pr-10 font-heading text-2xl font-bold text-aria-text sm:text-3xl"
            >
              Choose your plan
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-aria-text-secondary sm:text-[15px]">
              Compare features and pick the plan that fits your workflow. Upgrade
              anytime — changes apply immediately with prorated billing.
            </p>

            <div className="mt-6 flex justify-center sm:justify-start">
              <div className="inline-flex rounded-full border border-aria-border bg-aria-elevated p-1">
                {(["monthly", "yearly"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCycle(c)}
                    className={cn(
                      "rounded-full px-5 py-2 text-sm font-semibold capitalize transition-all",
                      cycle === c
                        ? "bg-aria-primary text-white shadow-sm"
                        : "text-aria-text-secondary hover:text-aria-text"
                    )}
                  >
                    {c}
                    {c === "yearly" && (
                      <span className="ml-1.5 text-[11px] font-medium text-aria-success">
                        −17%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Plans — single row */}
          <div className="px-4 py-6 sm:px-6 sm:py-8">
            <div className="overflow-x-auto pb-1">
              <div
                className="grid min-w-max items-stretch gap-4 lg:min-w-0"
                style={{
                  gridTemplateColumns: `repeat(${sortedPacks.length}, minmax(240px, 1fr))`,
                }}
              >
                {sortedPacks.map((pack) => (
                  <PlanCard
                    key={pack.id}
                    pack={pack}
                    cycle={cycle}
                    isCurrent={pack.slug === currentSlug}
                    isPopular={pack.slug === POPULAR_SLUG}
                    isLoading={checkout.isPending && selectingSlug === pack.slug}
                    onSelect={() => handleSelect(pack)}
                    compact
                  />
                ))}
              </div>
            </div>

            {checkout.isError && (
              <p className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {checkout.error.message}
              </p>
            )}

            <p className="mt-8 text-center text-xs leading-relaxed text-aria-text-muted">
              All paid plans include a 14-day trial. Secure payments via Stripe.
              Cancel or change plans anytime from your billing settings.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

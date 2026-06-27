"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Download,
  Loader2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { PlanPickerDialog } from "@/components/billing/plan-picker-dialog";
import { Button } from "@/components/ui/button";
import { useBilling, useBillingPortal, useInvoices } from "@/hooks/use-billing";
import { getPackFeatureLabels } from "@/lib/billing/plan-features";
import { cn } from "@/lib/utils";

function formatCardBrand(brand: string): string {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function BillingView() {
  const searchParams = useSearchParams();
  const pastDue = searchParams.get("status") === "past_due";
  const success = searchParams.get("success") === "true";

  const { data, isLoading, error } = useBilling();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const portal = useBillingPortal();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-aria-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load billing"}
      </div>
    );
  }

  const cycle = data.subscription.billing_cycle ?? "monthly";
  const price =
    cycle === "yearly" ? data.pack.price_yearly : data.pack.price_monthly;
  const messageLimit = data.limits.ai_messages_per_month;
  const used = data.usage.ai_messages_used;
  const pct =
    messageLimit > 0
      ? Math.min(100, Math.round((used / messageLimit) * 100))
      : 0;
  const features = getPackFeatureLabels(data.limits);
  const renewDate = data.subscription.current_period_end
    ? format(new Date(data.subscription.current_period_end), "MMM d, yyyy")
    : null;

  return (
    <div className="mx-auto w-full max-w-[1080px] px-7 pt-7 pb-12">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-aria-text">
          Billing
        </h1>
        <p className="mt-1.5 text-sm text-aria-text-secondary">
          Manage your plan, payment method, and invoices.
        </p>
      </div>

      {pastDue && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Payment past due</p>
            <p className="mt-1 text-amber-100/80">
              Update your payment method to restore full access.
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-2xl border border-aria-success/30 bg-aria-success/10 p-4 text-sm text-aria-success">
          Your subscription has been updated successfully.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-aria-primary/30 bg-aria-surface/70 p-6 backdrop-blur-md">
          <div className="pointer-events-none absolute -top-[30%] -right-[10%] size-56 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.18),transparent_65%)] blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-aria-primary/30 bg-aria-primary/15 px-2.5 py-0.5 text-xs font-semibold text-aria-primary-light">
                {data.pack.name} Plan
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-heading text-4xl font-bold text-aria-text">
                  ${Number(price).toFixed(0)}
                </span>
                <span className="text-sm text-aria-text-secondary">
                  / {cycle === "yearly" ? "year" : "month"}
                </span>
              </div>
              {renewDate && (
                <span className="text-xs text-aria-text-muted">
                  {data.subscription.status === "canceled"
                    ? `Access until ${renewDate}`
                    : `Renews on ${renewDate}`}
                </span>
              )}
              <span className="text-xs capitalize text-aria-text-muted">
                Status: {data.subscription.status.replace("_", " ")}
              </span>
            </div>
            <Button
              variant="outline"
              className="rounded-full border-aria-border bg-aria-elevated text-[13px] font-semibold"
              onClick={() => setPickerOpen(true)}
            >
              Change plan
            </Button>
          </div>

          <div className="relative mt-6 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-aria-text-secondary">Messages used</span>
              <span className="font-mono text-aria-text">
                {used.toLocaleString()} /{" "}
                {messageLimit < 0 ? "∞" : messageLimit.toLocaleString()}
              </span>
            </div>
            {messageLimit > 0 && (
              <div className="h-2 overflow-hidden rounded-full bg-aria-subtle">
                <div
                  className="aria-gradient h-full rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>

          <div className="relative mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {features.map((f) => (
              <span
                key={f}
                className="flex items-center gap-2.5 text-[13px] text-slate-300"
              >
                <Check className="size-4 shrink-0 text-aria-success" />
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-aria-border bg-aria-surface/70 p-6 backdrop-blur-md">
          <h2 className="font-heading text-[15px] font-semibold text-aria-text">
            Payment method
          </h2>
          {data.paymentMethod ? (
            <div className="flex items-center gap-3 rounded-xl border border-aria-border-subtle bg-[#16161f] p-3.5">
              <span className="flex size-10 items-center justify-center rounded-[9px] bg-aria-subtle text-aria-text">
                <CreditCard className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-aria-text">
                  {formatCardBrand(data.paymentMethod.brand)} ending in{" "}
                  {data.paymentMethod.last4}
                </span>
                <span className="text-xs text-aria-text-secondary">
                  Expires {String(data.paymentMethod.exp_month).padStart(2, "0")}{" "}
                  / {data.paymentMethod.exp_year}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-aria-text-secondary">
              No payment method on file.
            </p>
          )}
          <Button
            variant="outline"
            className="rounded-full border-aria-border bg-aria-elevated text-[13px] font-semibold"
            disabled={portal.isPending}
            onClick={() => portal.mutate()}
          >
            {portal.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Update payment method"
            )}
          </Button>
          <p className="text-xs leading-relaxed text-aria-text-muted">
            Payments are processed securely by Stripe. Monzi never stores your
            full card details.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3.5 font-heading text-[17px] font-semibold text-aria-text">
          Billing history
        </h2>
        <div className="overflow-hidden rounded-2xl border border-aria-border bg-aria-surface/70 backdrop-blur-md">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_0.6fr_44px] items-center gap-3 border-b border-aria-border bg-[#16161f] px-[18px] py-3 max-md:hidden">
            {["Invoice", "Date", "Amount", "Status", ""].map((h, i) => (
              <span
                key={i}
                className="text-[11px] font-semibold tracking-[0.05em] text-aria-text-secondary uppercase"
              >
                {h}
              </span>
            ))}
          </div>
          {invoicesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-aria-text-secondary" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="px-[18px] py-8 text-sm text-aria-text-secondary">
              No invoices yet.
            </p>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                className="grid grid-cols-1 items-center gap-2 border-b border-[#16161f] px-[18px] py-3.5 transition-colors hover:bg-white/[0.018] md:grid-cols-[1.4fr_1fr_1fr_0.6fr_44px]"
              >
                <span className="font-mono text-[13px] text-aria-text">
                  {inv.number ?? inv.id.slice(-8)}
                </span>
                <span className="text-[13px] text-aria-text-secondary">
                  {format(new Date(inv.date), "MMM d, yyyy")}
                </span>
                <span className="font-mono text-[13px] text-aria-text">
                  ${inv.amount.toFixed(2)} {inv.currency.toUpperCase()}
                </span>
                <span
                  className={cn(
                    "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                    inv.status === "paid"
                      ? "bg-aria-success/12 text-aria-success"
                      : "bg-amber-500/12 text-amber-400"
                  )}
                >
                  {inv.status}
                </span>
                {inv.pdfUrl ? (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download invoice"
                    className="flex size-[34px] items-center justify-center rounded-[9px] border border-aria-border bg-aria-elevated text-aria-text-secondary transition-colors hover:text-aria-text md:justify-self-end"
                  >
                    <Download className="size-4" />
                  </a>
                ) : (
                  <span />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <PlanPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentSlug={data.pack.slug}
        packs={data.availablePacks}
      />
    </div>
  );
}

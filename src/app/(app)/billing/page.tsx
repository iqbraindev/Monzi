import { Check, CreditCard, Download } from "lucide-react";

const PLAN_FEATURES = [
  "Up to 10 agents",
  "2,000 messages / month",
  "250+ app integrations",
  "5 team seats",
  "Priority support",
];

const INVOICES = [
  { id: "INV-2026-006", date: "Jun 1, 2026", amount: "$49.00", status: "Paid" },
  { id: "INV-2026-005", date: "May 1, 2026", amount: "$49.00", status: "Paid" },
  { id: "INV-2026-004", date: "Apr 1, 2026", amount: "$49.00", status: "Paid" },
  { id: "INV-2026-003", date: "Mar 1, 2026", amount: "$49.00", status: "Paid" },
];

export default function BillingPage() {
  const used = 1200;
  const limit = 2000;
  const pct = Math.round((used / limit) * 100);

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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Current plan */}
        <div className="relative overflow-hidden rounded-2xl border border-aria-primary/30 bg-aria-surface/70 p-6 backdrop-blur-md">
          <div className="pointer-events-none absolute -top-[30%] -right-[10%] size-56 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.18),transparent_65%)] blur-3xl" />
          <div className="relative flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-aria-primary/30 bg-aria-primary/15 px-2.5 py-0.5 text-xs font-semibold text-aria-primary-light">
                Pro Plan
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-heading text-4xl font-bold text-aria-text">
                  $49
                </span>
                <span className="text-sm text-aria-text-secondary">/ month</span>
              </div>
              <span className="text-xs text-aria-text-muted">
                Renews on Jul 1, 2026
              </span>
            </div>
            <button className="h-9 rounded-full border border-aria-border bg-aria-elevated px-4 text-[13px] font-semibold text-aria-text transition-colors hover:border-aria-primary">
              Change plan
            </button>
          </div>

          <div className="relative mt-6 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-aria-text-secondary">Messages used</span>
              <span className="font-mono text-aria-text">
                {used.toLocaleString()} / {limit.toLocaleString()}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-aria-subtle">
              <div
                className="aria-gradient h-full rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {PLAN_FEATURES.map((f) => (
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

        {/* Payment method */}
        <div className="flex flex-col gap-4 rounded-2xl border border-aria-border bg-aria-surface/70 p-6 backdrop-blur-md">
          <h2 className="font-heading text-[15px] font-semibold text-aria-text">
            Payment method
          </h2>
          <div className="flex items-center gap-3 rounded-xl border border-aria-border-subtle bg-[#16161f] p-3.5">
            <span className="flex size-10 items-center justify-center rounded-[9px] bg-aria-subtle text-aria-text">
              <CreditCard className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-aria-text">
                Visa ending in 4242
              </span>
              <span className="text-xs text-aria-text-secondary">
                Expires 09 / 2028
              </span>
            </div>
          </div>
          <button className="h-9 rounded-full border border-aria-border bg-aria-elevated text-[13px] font-semibold text-aria-text transition-colors hover:border-aria-primary">
            Update payment method
          </button>
          <p className="text-xs leading-relaxed text-aria-text-muted">
            Payments are processed securely by Stripe. Monzi never stores your
            full card details.
          </p>
        </div>
      </div>

      {/* Invoices */}
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
          {INVOICES.map((inv) => (
            <div
              key={inv.id}
              className="grid grid-cols-1 items-center gap-2 border-b border-[#16161f] px-[18px] py-3.5 transition-colors hover:bg-white/[0.018] md:grid-cols-[1.4fr_1fr_1fr_0.6fr_44px]"
            >
              <span className="font-mono text-[13px] text-aria-text">
                {inv.id}
              </span>
              <span className="text-[13px] text-aria-text-secondary">
                {inv.date}
              </span>
              <span className="font-mono text-[13px] text-aria-text">
                {inv.amount}
              </span>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-aria-success/12 px-2.5 py-1 text-xs font-semibold text-aria-success">
                {inv.status}
              </span>
              <button
                aria-label="Download invoice"
                className="flex size-[34px] items-center justify-center justify-self-start rounded-[9px] border border-aria-border bg-aria-elevated text-aria-text-secondary transition-colors hover:text-aria-text md:justify-self-end"
              >
                <Download className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

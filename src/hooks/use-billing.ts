import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BillingOverview, InvoiceRow } from "@/lib/billing/types";

async function fetchBilling(): Promise<BillingOverview> {
  const res = await fetch("/api/billing");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load billing");
  }
  return (await res.json()) as BillingOverview;
}

async function fetchInvoices(): Promise<InvoiceRow[]> {
  const res = await fetch("/api/billing/invoices");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load invoices");
  }
  const data = (await res.json()) as { invoices: InvoiceRow[] };
  return data.invoices;
}

export function useBilling() {
  return useQuery({
    queryKey: ["billing"],
    queryFn: fetchBilling,
    staleTime: 30_000,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["billing", "invoices"],
    queryFn: fetchInvoices,
    staleTime: 60_000,
  });
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { plan: string; cycle: "monthly" | "yearly" }) => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Checkout failed");
      return body as { url?: string; updated?: boolean };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else if (data.updated) {
        qc.invalidateQueries({ queryKey: ["billing"] });
        window.location.href = "/billing?success=true";
      }
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Portal failed");
      return body as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });
}

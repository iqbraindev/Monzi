import { auth } from "@clerk/nextjs/server";

import type { InvoiceRow } from "@/lib/billing/types";
import { getStripeCustomerId } from "@/lib/billing/subscription";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { ensureSupabaseUser } from "@/lib/users/provision";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);
    const customerId = await getStripeCustomerId(userId);

    if (!customerId || !(await isStripeConfigured())) {
      return Response.json({ invoices: [] as InvoiceRow[] });
    }

    const invoices = await (await getStripe()).invoices.list({
      customer: customerId,
      limit: 24,
    });

    const rows: InvoiceRow[] = invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      date: new Date((inv.created ?? 0) * 1000).toISOString(),
      amount: (inv.amount_paid ?? inv.amount_due ?? 0) / 100,
      currency: inv.currency,
      status: inv.status ?? "unknown",
      pdfUrl: inv.invoice_pdf ?? null,
      hostedUrl: inv.hosted_invoice_url ?? null,
    }));

    return Response.json({ invoices: rows });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load invoices";
    return Response.json({ error: message }, { status: 500 });
  }
}

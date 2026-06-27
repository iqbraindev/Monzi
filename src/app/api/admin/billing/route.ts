import { requireSuperAdmin } from "@/lib/auth/require-role";
import { getBillingBreakdown } from "@/lib/admin/billing";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const billing = await getBillingBreakdown();
    return Response.json({ billing });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load billing data";
    return Response.json({ error: message }, { status: 500 });
  }
}

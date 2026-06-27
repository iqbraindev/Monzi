import { requireSuperAdmin } from "@/lib/auth/require-role";
import { listAuditLog } from "@/lib/admin/usage";

export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? 50);
    const entries = await listAuditLog(limit);
    return Response.json({ entries });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load audit log";
    return Response.json({ error: message }, { status: 500 });
  }
}

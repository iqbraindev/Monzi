import { requireSuperAdmin } from "@/lib/auth/require-role";
import { getPlatformStats } from "@/lib/admin/stats";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const stats = await getPlatformStats();
    return Response.json({ stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load stats";
    return Response.json({ error: message }, { status: 500 });
  }
}

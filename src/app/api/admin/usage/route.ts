import { requireSuperAdmin } from "@/lib/auth/require-role";
import {
  getPlatformUsageTotals,
  getUsageLeaderboard,
} from "@/lib/admin/usage";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const [totals, leaderboard] = await Promise.all([
      getPlatformUsageTotals(),
      getUsageLeaderboard(),
    ]);
    return Response.json({ totals, leaderboard });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load usage";
    return Response.json({ error: message }, { status: 500 });
  }
}

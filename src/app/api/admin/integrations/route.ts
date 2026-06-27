import { requireSuperAdmin } from "@/lib/auth/require-role";
import { listIntegrationsStatus } from "@/lib/platform/integrations";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const data = await listIntegrationsStatus();
    return Response.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load integrations";
    return Response.json({ error: message }, { status: 500 });
  }
}

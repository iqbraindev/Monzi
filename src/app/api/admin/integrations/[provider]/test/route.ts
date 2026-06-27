import { requireSuperAdmin } from "@/lib/auth/require-role";
import {
  getProviderById,
  testIntegrationProvider,
} from "@/lib/platform/integrations";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { provider } = await params;
    if (!getProviderById(provider)) {
      return Response.json({ error: "Provider not found" }, { status: 404 });
    }

    const result = await testIntegrationProvider(provider);
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Connection test failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

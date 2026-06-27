import { requireSuperAdmin } from "@/lib/auth/require-role";
import { logAuditEvent } from "@/lib/billing/audit";
import {
  getProviderById,
  listIntegrationsStatus,
  updateIntegrationProvider,
} from "@/lib/platform/integrations";
import { invalidateIntegrationCaches } from "@/lib/platform/invalidate";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { provider } = await params;
    if (!getProviderById(provider)?.editable) {
      return Response.json({ error: "Provider not found or not editable" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, string>;
    const changed = await updateIntegrationProvider(provider, body, auth.userId);

    if (changed.length === 0) {
      return Response.json({ error: "No changes submitted" }, { status: 400 });
    }

    invalidateIntegrationCaches(provider);

    await logAuditEvent({
      actorId: auth.userId,
      action: "integration.update",
      targetType: "integration",
      targetId: provider,
      metadata: { fields: changed },
    });

    const data = await listIntegrationsStatus();
    return Response.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update integration";
    return Response.json({ error: message }, { status: 400 });
  }
}

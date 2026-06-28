import { requireSuperAdmin } from "@/lib/auth/require-role";
import { logAuditEvent } from "@/lib/billing/audit";
import {
  listCatalogApps,
  setCatalogAppEnabled,
  upsertCatalogAppFromSearch,
} from "@/lib/composio/catalog";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();

  try {
    const body = (await req.json()) as {
      enabled?: boolean;
      name?: string;
      logo?: string | null;
      description?: string | null;
      category?: string;
    };

    if (typeof body.enabled !== "boolean") {
      return Response.json({ error: "enabled is required" }, { status: 400 });
    }

    let app;
    if (body.name) {
      app = await upsertCatalogAppFromSearch(
        {
          slug,
          name: body.name,
          logo: body.logo ?? null,
          description: body.description ?? null,
          category: body.category ?? "Other",
          noAuth: false,
        },
        body.enabled,
        auth.userId
      );
    } else {
      app = await setCatalogAppEnabled(slug, body.enabled, auth.userId);
    }

    await logAuditEvent({
      actorId: auth.userId,
      action: body.enabled ? "composio_app.enabled" : "composio_app.disabled",
      targetType: "composio_catalog_app",
      targetId: slug,
      metadata: { name: app.name },
    });

    const apps = await listCatalogApps();
    return Response.json({ app, apps });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update Composio app";
    const status = message.includes("not found") ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}

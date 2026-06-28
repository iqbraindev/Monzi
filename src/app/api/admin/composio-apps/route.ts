import { requireSuperAdmin } from "@/lib/auth/require-role";
import { logAuditEvent } from "@/lib/billing/audit";
import {
  listCatalogApps,
  searchComposioToolkits,
  setCatalogAppEnabled,
  upsertCatalogAppFromSearch,
} from "@/lib/composio/catalog";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const apps = await listCatalogApps();
    return Response.json({ apps });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load Composio apps";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as {
      slug?: string;
      name?: string;
      logo?: string | null;
      description?: string | null;
      category?: string;
      enabled?: boolean;
    };

    const slug = body.slug?.trim().toLowerCase();
    const name = body.name?.trim();
    if (!slug || !name) {
      return Response.json(
        { error: "slug and name are required" },
        { status: 400 }
      );
    }

    const app = await upsertCatalogAppFromSearch(
      {
        slug,
        name,
        logo: body.logo ?? null,
        description: body.description ?? null,
        category: body.category ?? "Other",
        noAuth: false,
      },
      body.enabled ?? true,
      auth.userId
    );

    await logAuditEvent({
      actorId: auth.userId,
      action: body.enabled === false ? "composio_app.added_disabled" : "composio_app.added",
      targetType: "composio_catalog_app",
      targetId: slug,
      metadata: { name, enabled: app.is_enabled },
    });

    const apps = await listCatalogApps();
    return Response.json({ app, apps });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save Composio app";
    return Response.json({ error: message }, { status: 500 });
  }
}

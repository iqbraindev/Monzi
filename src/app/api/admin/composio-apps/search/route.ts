import { requireSuperAdmin } from "@/lib/auth/require-role";
import { getCatalogAppMap, searchComposioToolkits } from "@/lib/composio/catalog";

export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const limit = Number(url.searchParams.get("limit") ?? "24");

  if (!query) {
    return Response.json({ results: [] });
  }

  try {
    const [results, catalogMap] = await Promise.all([
      searchComposioToolkits(query, limit),
      getCatalogAppMap(),
    ]);

    return Response.json({
      results: results.map((item) => {
        const existing = catalogMap.get(item.slug);
        return {
          ...item,
          inCatalog: Boolean(existing),
          isEnabled: existing?.is_enabled ?? false,
        };
      }),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Composio search failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

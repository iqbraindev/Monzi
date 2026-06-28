import { auth } from "@clerk/nextjs/server";

import { listEnabledIntegrations } from "@/lib/composio/catalog";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const apps = await listEnabledIntegrations();
    return Response.json({ apps });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load integration catalog";
    return Response.json({ error: message }, { status: 500 });
  }
}

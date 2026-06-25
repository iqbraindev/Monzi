import { auth } from "@clerk/nextjs/server";

import { listActiveConnections } from "@/lib/composio/tools";
import { integrationNameFromToolkit } from "@/lib/composio/toolkits";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await listActiveConnections(userId);
    const connections = accounts.map((account) => ({
      id: account.id,
      toolkit: account.toolkit?.slug ?? "",
      name: integrationNameFromToolkit(account.toolkit?.slug ?? ""),
      status: account.status,
    }));

    return Response.json({ connections });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list connections";
    return Response.json({ error: message }, { status: 500 });
  }
}

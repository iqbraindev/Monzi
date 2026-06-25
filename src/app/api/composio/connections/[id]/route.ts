import { auth } from "@clerk/nextjs/server";

import { getComposio } from "@/lib/composio/client";
import { removeToolkitFromAgents } from "@/lib/composio/agent-toolkits";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const composio = getComposio();
    const userAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
    });
    const account = userAccounts.items.find((item) => item.id === id);

    if (!account) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const toolkitSlug = account.toolkit?.slug;
    await composio.connectedAccounts.delete(id);

    if (toolkitSlug) {
      await removeToolkitFromAgents(userId, toolkitSlug);
    }

    return Response.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to disconnect";
    return Response.json({ error: message }, { status: 500 });
  }
}

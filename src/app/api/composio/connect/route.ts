import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getOrCreateAuthConfigId } from "@/lib/composio/auth-configs";
import { assignToolkitToAgents } from "@/lib/composio/agent-toolkits";
import { getAppCallbackUrl, getComposio } from "@/lib/composio/client";
import {
  getUserIntegrationLimit,
  incrementIntegrationsConnected,
} from "@/lib/composio/limits";
import { listActiveConnections } from "@/lib/composio/tools";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    toolkit?: string;
    agentIds?: string[];
  };

  const toolkit = body.toolkit?.trim().toLowerCase();
  if (!toolkit) {
    return Response.json({ error: "toolkit is required" }, { status: 400 });
  }

  try {
    const existing = await listActiveConnections(userId);
    const alreadyConnected = existing.some(
      (c) => c.toolkit?.slug === toolkit
    );

    if (!alreadyConnected) {
      const limit = await getUserIntegrationLimit(userId);
      if (limit >= 0 && existing.length >= limit) {
        return Response.json(
          { error: `Integration limit reached (${limit})` },
          { status: 403 }
        );
      }
    }

    const authConfigId = await getOrCreateAuthConfigId(toolkit);
    const composio = getComposio();

    const connectionRequest = await composio.connectedAccounts.initiate(
      userId,
      authConfigId,
      {
        callbackUrl: getAppCallbackUrl("/api/composio/callback"),
      }
    );

    await assignToolkitToAgents(userId, toolkit, body.agentIds);

    if (!alreadyConnected) {
      await incrementIntegrationsConnected(userId);
    }

    return Response.json({
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to initiate connection";
    return Response.json({ error: message }, { status: 500 });
  }
}

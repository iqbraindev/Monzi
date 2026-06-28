import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

import { getOrCreateAuthConfigId } from "@/lib/composio/auth-configs";
import { assignToolkitToAgents } from "@/lib/composio/agent-toolkits";
import { isCatalogAppEnabled } from "@/lib/composio/catalog";
import { getAppCallbackUrl } from "@/lib/composio/client";
import { incrementIntegrationsConnected } from "@/lib/composio/limits";
import { getComposioScope } from "@/lib/composio/scope";
import { initiateConnection, listActiveConnections } from "@/lib/composio/tools";
import { canConnectIntegration } from "@/lib/billing/limit-enforcer";
import {
  assertMemberCanMutate,
  memberAccessDeniedResponse,
} from "@/lib/rbac/member-access";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(userId, { request: req });

  try {
    assertMemberCanMutate(ctx);
  } catch (err) {
    return memberAccessDeniedResponse(err);
  }

  const composioScope = getComposioScope(ctx);

  const body = (await req.json()) as {
    toolkit?: string;
    agentIds?: string[];
  };

  const toolkit = body.toolkit?.trim().toLowerCase();
  if (!toolkit) {
    return Response.json({ error: "toolkit is required" }, { status: 400 });
  }

  try {
    if (!(await isCatalogAppEnabled(toolkit))) {
      return Response.json(
        { error: "This integration is not available on the platform" },
        { status: 403 }
      );
    }

    const existing = await listActiveConnections(ctx.workspaceId, composioScope);
    const alreadyConnected = existing.some(
      (c) => c.toolkit?.slug === toolkit
    );

    if (!alreadyConnected) {
      const integrationCheck = await canConnectIntegration(
        ctx.workspaceId,
        ctx.ownerUserId,
        composioScope
      );
      if (!integrationCheck.ok) {
        return Response.json(integrationCheck.error, { status: 403 });
      }
    }

    const authConfigId = await getOrCreateAuthConfigId(toolkit);

    const connectionRequest = await initiateConnection(
      ctx.workspaceId,
      authConfigId,
      getAppCallbackUrl("/api/composio/callback")
    );

    await assignToolkitToAgents(ctx.workspaceId, toolkit, body.agentIds);

    if (!alreadyConnected) {
      await incrementIntegrationsConnected(ctx.workspaceId, ctx.ownerUserId);
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

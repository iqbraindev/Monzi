import { auth } from "@clerk/nextjs/server";

import { adaptGmailMessageDetail } from "@/lib/composio/gmail-message";
import { getComposioScope, type ComposioScopeOptions } from "@/lib/composio/scope";
import { executeTool, listActiveConnections } from "@/lib/composio/tools";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

async function assertGmailConnected(
  workspaceId: string,
  composioScope: ComposioScopeOptions
) {
  const connections = await listActiveConnections(workspaceId, composioScope);
  const connected = connections.some((c) => c.toolkit?.slug === "gmail");
  if (!connected) {
    return Response.json(
      { error: "gmail is not connected", code: "NOT_CONNECTED", toolkit: "gmail" },
      { status: 403 }
    );
  }
  return null;
}

function unwrapComposioResult(result: unknown): unknown {
  if (
    result &&
    typeof result === "object" &&
    "data" in result &&
    (result as { data?: unknown }).data !== undefined
  ) {
    return (result as { data: unknown }).data;
  }
  return result;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await resolveWorkspaceContext(userId, { request: req });
    const composioScope = getComposioScope(ctx);
    const denied = await assertGmailConnected(ctx.workspaceId, composioScope);
    if (denied) return denied;

    const { messageId } = await params;
    const result = await executeTool(
      ctx.workspaceId,
      "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID",
      {
        message_id: messageId,
        format: "full",
      },
      undefined,
      composioScope
    );

    const detail = adaptGmailMessageDetail(unwrapComposioResult(result));
    if (!detail) {
      return Response.json({ error: "Could not parse message" }, { status: 500 });
    }

    return Response.json({ message: detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load email";
    console.error("[gmail message GET]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await resolveWorkspaceContext(userId, { request: req });
    const composioScope = getComposioScope(ctx);
    const denied = await assertGmailConnected(ctx.workspaceId, composioScope);
    if (denied) return denied;

    const { messageId } = await params;
    await executeTool(
      ctx.workspaceId,
      "GMAIL_ADD_LABEL_TO_EMAIL",
      {
        message_id: messageId,
        remove_label_ids: ["UNREAD"],
      },
      undefined,
      composioScope
    );

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark as read";
    console.error("[gmail message PATCH]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

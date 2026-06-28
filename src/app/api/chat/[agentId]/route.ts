import { auth } from "@clerk/nextjs/server";
import type { UIMessage } from "ai";

import {
  persistUserMessage,
  prepareAgentTurn,
  streamAgentTurn,
} from "@/lib/agents/run-agent-turn";
import { assertAgentHasEnergy } from "@/lib/billing/energy";
import { formatAiErrorMessage } from "@/lib/ai/user-facing-errors";
import { getRedisOptional } from "@/lib/redis/optional";
import { ensureSupabaseUser } from "@/lib/users/provision";
import { getComposioScope } from "@/lib/composio/scope";
import { assertMemberCanUseAgent, memberAccessDeniedResponse } from "@/lib/rbac/member-access";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);
    const ctx = await resolveWorkspaceContext(userId, { request: req });

    const { agentId } = await params;

    try {
      await assertMemberCanUseAgent(ctx, agentId);
    } catch (err) {
      return memberAccessDeniedResponse(err);
    }

    const {
      messages,
      conversationId: requestedConversationId,
    }: { messages: UIMessage[]; conversationId?: string } = await req.json();

    const redis = getRedisOptional();
    if (redis) {
      const key = `chat:rate:${ctx.workspaceId}:${new Date().toISOString().slice(0, 10)}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 86400);
      if (count > 200) {
        return Response.json(
          { error: "Daily message limit reached. Try again tomorrow." },
          { status: 429 }
        );
      }
    }

    const turnCtx = await prepareAgentTurn({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      ownerUserId: ctx.ownerUserId,
      composioScope: getComposioScope(ctx),
      agentId,
      conversationId: requestedConversationId,
    });

    if (!turnCtx) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    const energyCheck = await assertAgentHasEnergy(
      ctx.ownerUserId,
      ctx.workspaceId,
      turnCtx.agent
    );
    if (!energyCheck.ok) {
      return Response.json({ error: energyCheck.message }, { status: 402 });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      const text =
        lastUser.parts
          ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("") ?? "";

      await persistUserMessage(turnCtx, text);
    }

    const result = await streamAgentTurn(turnCtx, messages);
    return result.toUIMessageStreamResponse({
      onError: formatAiErrorMessage,
    });
  } catch (err) {
    console.error("[chat]", err);
    return Response.json(
      { error: formatAiErrorMessage(err) },
      { status: 500 }
    );
  }
}

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

    const { agentId } = await params;
    const {
      messages,
      conversationId: requestedConversationId,
    }: { messages: UIMessage[]; conversationId?: string } = await req.json();

    const redis = getRedisOptional();
    if (redis) {
      const key = `chat:rate:${userId}:${new Date().toISOString().slice(0, 10)}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 86400);
      if (count > 200) {
        return Response.json(
          { error: "Daily message limit reached. Try again tomorrow." },
          { status: 429 }
        );
      }
    }

    const ctx = await prepareAgentTurn({
      userId,
      agentId,
      conversationId: requestedConversationId,
    });

    if (!ctx) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    const energyCheck = await assertAgentHasEnergy(userId, ctx.agent);
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

      await persistUserMessage(ctx, text);
    }

    const result = await streamAgentTurn(ctx, messages);
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

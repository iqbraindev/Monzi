import { auth } from "@clerk/nextjs/server";

import { getUserVoiceEnabled } from "@/lib/billing/limits";
import { appendVoiceConversationGuidance } from "@/lib/agents/build-system-prompt";
import {
  loadAgentForUser,
  prepareAgentTurn,
} from "@/lib/agents/run-agent-turn";
import { getOrCreateConversation } from "@/lib/chat/conversation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";
import {
  buildVoiceOverrides,
  getElevenLabsAgentId,
  getElevenLabsSignedUrl,
} from "@/lib/voice/elevenlabs";
import {
  cacheVoiceContext,
  registerVoiceSession,
  resetVoiceIntro,
} from "@/lib/voice/session-cache";
import { createVoiceSessionToken } from "@/lib/voice/session-token";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);

    const voiceAllowed = await getUserVoiceEnabled(userId);
    if (!voiceAllowed) {
      return Response.json(
        { error: "Voice mode requires a Starter plan or higher." },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      agentId?: string;
      conversationId?: string;
    };

    const { agentId, conversationId: requestedConversationId } = body;
    if (!agentId) {
      return Response.json({ error: "agentId is required" }, { status: 400 });
    }

    const elevenLabsAgentId = getElevenLabsAgentId();
    if (!elevenLabsAgentId) {
      return Response.json(
        {
          error:
            "ElevenLabs voice is not configured. Run scripts/setup-elevenlabs-agent.mjs and set ELEVENLABS_AGENT_ID.",
        },
        { status: 503 }
      );
    }

    const agent = await loadAgentForUser(userId, agentId);
    if (!agent) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const conversationId = await getOrCreateConversation(
      supabase,
      userId,
      agentId,
      requestedConversationId
    );

    if (!conversationId) {
      return Response.json(
        { error: "Failed to resolve conversation" },
        { status: 500 }
      );
    }

    const signedUrl = await getElevenLabsSignedUrl(elevenLabsAgentId);
    const overrides = buildVoiceOverrides(agent);

    const llmSecret = process.env.ELEVENLABS_CUSTOM_LLM_SECRET;
    if (!llmSecret) {
      return Response.json(
        {
          error:
            "ELEVENLABS_CUSTOM_LLM_SECRET is not configured. Voice tools require the custom LLM endpoint.",
        },
        { status: 503 }
      );
    }

    const voiceToken = createVoiceSessionToken(llmSecret, {
      userId,
      agentId,
      conversationId,
    });

    registerVoiceSession({ userId, agentId, conversationId });
    resetVoiceIntro(conversationId);

    // Pre-warm agent + Composio tools so the custom LLM responds within ElevenLabs' timeout.
    const ctx = await prepareAgentTurn({ userId, agentId, conversationId });
    if (ctx) {
      ctx.system = appendVoiceConversationGuidance(ctx.system);
      cacheVoiceContext(conversationId, ctx);
    }

    return Response.json({
      signedUrl,
      conversationId,
      overrides,
      agentName: agent.name,
      voiceToken,
      userId,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Voice session setup failed";
    console.error("[elevenlabs/voice-session]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

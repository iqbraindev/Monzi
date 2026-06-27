import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { DbAgent } from "@/lib/agents/adapter";
import { getAgentLlmModel } from "@/lib/agents/llm-models";
import { buildSystemPrompt } from "@/lib/agents/build-system-prompt";
import {
  markOpenRouterCreditsExhausted,
  resolveAgentChatModel,
} from "@/lib/ai/openrouter";
import { dbMessagesToUiMessages } from "@/lib/chat/message-mapper";
import { getOrCreateConversation } from "@/lib/chat/conversation";
import { getLangChainTools, listActiveConnections } from "@/lib/composio/tools";
import { TOOLKIT_CATALOG } from "@/lib/composio/toolkits";
import { getDashboardTools } from "@/lib/dashboard/tools";
import { listDashboardSummaries } from "@/lib/dashboard/service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface AgentTurnContext {
  agent: DbAgent;
  conversationId: string;
  composioApps: string[];
  aiTools: Record<string, ReturnType<typeof tool>>;
  system: string;
  supabase: SupabaseClient;
}

export interface AgentTurnResult {
  assistantText: string;
  toolCalls: unknown;
  toolResults: unknown;
}

export async function loadAgentForUser(
  userId: string,
  agentId: string
): Promise<DbAgent | null> {
  const supabase = getSupabaseAdmin();
  const { data: agentRow } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("user_id", userId)
    .single();

  return agentRow ? (agentRow as DbAgent) : null;
}

export async function prepareAgentTurn(params: {
  userId: string;
  agentId: string;
  conversationId?: string | null;
}): Promise<AgentTurnContext | null> {
  const supabase = getSupabaseAdmin();
  const agent = await loadAgentForUser(params.userId, params.agentId);
  if (!agent) return null;

  const agentApps = agent.tools?.composio_apps ?? [];
  const connections = await listActiveConnections(params.userId);
  const connectedApps = connections
    .map((c) => c.toolkit?.slug)
    .filter((slug): slug is string => Boolean(slug));
  const composioApps = agentApps.filter((slug) => connectedApps.includes(slug));

  const conversationId = await getOrCreateConversation(
    supabase,
    params.userId,
    params.agentId,
    params.conversationId
  );

  if (!conversationId) return null;

  const lcTools = await getLangChainTools(params.userId, composioApps);
  const composioAiTools = Object.fromEntries(
    lcTools.map((t) => [
      t.name,
      tool({
        description: t.description,
        inputSchema: t.schema as z.ZodTypeAny,
        execute: async (args) => t.invoke(args),
      }),
    ])
  );

  const dashboardSummaries = await listDashboardSummaries(supabase, params.userId);
  const dashboardTools =
    agent.tools?.dashboard_control !== false
      ? getDashboardTools({
          userId: params.userId,
          agentId: params.agentId,
          conversationId,
        })
      : {};

  const composioAppNames = composioApps.map(
    (slug) => TOOLKIT_CATALOG[slug]?.name ?? slug
  );

  const system = buildSystemPrompt({
    agent,
    composioAppNames,
    dashboards: dashboardSummaries,
  });

  return {
    agent,
    conversationId,
    composioApps,
    aiTools: { ...composioAiTools, ...dashboardTools },
    system,
    supabase,
  };
}

export async function loadConversationUiMessages(
  conversationId: string
): Promise<UIMessage[]> {
  const supabase = getSupabaseAdmin();
  const { data: rows } = await supabase
    .from("messages")
    .select("id, role, content, tool_calls, tool_results, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return dbMessagesToUiMessages(rows ?? []);
}

export async function persistUserMessage(
  ctx: AgentTurnContext,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const { data: last } = await ctx.supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", ctx.conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.role === "user" && last.content?.trim() === trimmed) return;

  await ctx.supabase.from("messages").insert({
    conversation_id: ctx.conversationId,
    role: "user",
    content: trimmed,
  });
}

export async function persistAssistantMessage(
  ctx: AgentTurnContext,
  text: string,
  toolCalls?: unknown,
  toolResults?: unknown
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const { data: last } = await ctx.supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", ctx.conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.role === "assistant" && last.content?.trim() === trimmed) return;

  await ctx.supabase.from("messages").insert({
    conversation_id: ctx.conversationId,
    role: "assistant",
    content: trimmed,
    tool_calls: toolCalls ? toolCalls : null,
    tool_results: toolResults ? toolResults : null,
  });
  await ctx.supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ctx.conversationId);
}

export async function streamAgentTurn(
  ctx: AgentTurnContext,
  messages: UIMessage[]
) {
  const llmModel = getAgentLlmModel(ctx.agent);
  const model = await resolveAgentChatModel(llmModel);
  return streamText({
    model,
    system: ctx.system,
    messages: await convertToModelMessages(messages),
    tools: ctx.aiTools,
    stopWhen: stepCountIs(5),
    onError: ({ error }) => {
      if (
        error &&
        typeof error === "object" &&
        "statusCode" in error &&
        error.statusCode === 402
      ) {
        markOpenRouterCreditsExhausted();
      }
      console.error("[agent-turn]", error);
    },
    onFinish: async ({ text, toolCalls, toolResults }) => {
      await persistAssistantMessage(
        ctx,
        text,
        toolCalls?.length ? toolCalls : undefined,
        toolResults?.length ? toolResults : undefined
      );
    },
  });
}

export async function executeAgentTurn(
  ctx: AgentTurnContext,
  messages: UIMessage[]
): Promise<AgentTurnResult> {
  const llmModel = getAgentLlmModel(ctx.agent);
  const model = await resolveAgentChatModel(llmModel);
  const result = await generateText({
    model,
    system: ctx.system,
    messages: await convertToModelMessages(messages),
    tools: ctx.aiTools,
    stopWhen: stepCountIs(5),
  });

  await persistAssistantMessage(
    ctx,
    result.text,
    result.toolCalls?.length ? result.toolCalls : undefined,
    result.toolResults?.length ? result.toolResults : undefined
  );

  return {
    assistantText: result.text,
    toolCalls: result.toolCalls ?? null,
    toolResults: result.toolResults ?? null,
  };
}

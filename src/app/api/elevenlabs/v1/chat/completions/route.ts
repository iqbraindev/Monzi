import { randomUUID } from "node:crypto";

import { appendVoiceConversationGuidance } from "@/lib/agents/build-system-prompt";
import {
  loadAgentForUser,
  loadConversationUiMessages,
  persistUserMessage,
  prepareAgentTurn,
  streamAgentTurn,
} from "@/lib/agents/run-agent-turn";
import {
  formatOpenAIChunk,
  formatSSEKeepalive,
  openAIStreamHeaders,
} from "@/lib/voice/openai-sse";
import {
  latestUserText,
  openAIMessagesToUi,
  uiMessageText,
  type OpenAIChatMessage,
} from "@/lib/voice/openai-messages";
import {
  cacheVoiceContext,
  getActiveVoiceSession,
  getCachedVoiceContext,
} from "@/lib/voice/session-cache";
import {
  verifyVoiceSessionToken,
  type VoiceSessionPayload,
} from "@/lib/voice/session-token";
import { generateVoiceAcknowledgment } from "@/lib/voice/voice-acknowledgment";

export const maxDuration = 120;

interface ChatCompletionRequest {
  messages?: OpenAIChatMessage[];
  model?: string;
  stream?: boolean;
  user_id?: string;
  elevenlabs_extra_body?: Record<string, unknown>;
  custom_llm_extra_body?: Record<string, unknown>;
}

const VOICE_EMPTY_FALLBACK =
  "Sorry, I wasn't able to get that information just now. Please try again.";
const KEEPALIVE_MS = 1500;

function verifyCustomLlmAuth(req: Request): boolean {
  const secret = process.env.ELEVENLABS_CUSTOM_LLM_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice("Bearer ".length) === secret;
}

function extractVoiceToken(body: ChatCompletionRequest): string | undefined {
  const candidates = [body.elevenlabs_extra_body, body.custom_llm_extra_body];
  for (const extra of candidates) {
    const token = extra?.monzi_voice_token;
    if (typeof token === "string" && token.trim()) return token.trim();
  }
  return undefined;
}

function resolveVoiceSession(
  body: ChatCompletionRequest,
  llmSecret: string
): VoiceSessionPayload | null {
  const token = extractVoiceToken(body);
  if (token) {
    const verified = verifyVoiceSessionToken(llmSecret, token);
    if (verified) return verified;
  }

  if (typeof body.user_id === "string" && body.user_id.trim()) {
    return getActiveVoiceSession(body.user_id.trim());
  }

  return null;
}

function isClientAbort(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const { name, message } = err as { name?: string; message?: string };
  return (
    name === "AbortError" ||
    name === "ResponseAborted" ||
    (typeof message === "string" && message.includes("ResponseAborted"))
  );
}

function streamSpokenResponse(text: string, model = "monzi"): Response {
  const chunkId = `chatcmpl-${randomUUID()}`;
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  void (async () => {
    try {
      await writer.write(
        encoder.encode(
          formatOpenAIChunk({
            id: chunkId,
            model,
            role: "assistant",
            content: text,
          })
        )
      );
      await writer.write(
        encoder.encode(formatOpenAIChunk({ id: chunkId, model, finish: true }))
      );
      await writer.write(encoder.encode("data: [DONE]\n\n"));
      await writer.close();
    } catch (err) {
      if (!isClientAbort(err)) throw err;
    }
  })();

  return new Response(readable, { status: 200, headers: openAIStreamHeaders() });
}

export async function POST(req: Request) {
  const llmSecret = process.env.ELEVENLABS_CUSTOM_LLM_SECRET;
  if (!llmSecret) {
    return streamSpokenResponse(
      "Voice assistant is not configured on the server."
    );
  }

  let body: ChatCompletionRequest;
  try {
    body = (await req.json()) as ChatCompletionRequest;
  } catch {
    return streamSpokenResponse("I received a request I couldn't understand.");
  }

  const model = body.model ?? "monzi";
  const wantsStream = body.stream !== false;

  if (!verifyCustomLlmAuth(req)) {
    console.error(
      "[elevenlabs/v1/chat/completions] Bearer auth mismatch — run scripts/configure-elevenlabs-custom-llm.mjs"
    );
    return streamSpokenResponse(
      "Sorry, I'm having authentication trouble. Please try starting the call again."
    );
  }

  const session = resolveVoiceSession(body, llmSecret);
  const incoming = body.messages ?? [];
  const latestUser = latestUserText(incoming);

  console.info(
    "[elevenlabs/v1/chat/completions]",
    JSON.stringify({
      hasSession: Boolean(session),
      hasUserMessage: Boolean(latestUser),
      messageCount: incoming.length,
      stream: wantsStream,
      userId: body.user_id ?? null,
    })
  );

  if (!session) {
    return streamSpokenResponse("Hi! How can I help you today?");
  }

  if (incoming.length === 0 || !latestUser) {
    const agent = await loadAgentForUser(session.userId, session.agentId);
    return streamSpokenResponse(
      agent ? `Hi, I'm ${agent.name}. How can I help?` : "Hi! How can I help you today?"
    );
  }

  const chunkId = `chatcmpl-${randomUUID()}`;
  const uiMessages = openAIMessagesToUi(incoming);
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const abortSignal = req.signal;

  let streamedChars = 0;
  let closed = false;

  const isAborted = () => closed || abortSignal.aborted;

  const closeWriter = async () => {
    if (closed) return;
    closed = true;
    try {
      await writer.close();
    } catch (err) {
      if (!isClientAbort(err)) throw err;
    }
  };

  const enqueue = async (options: {
    content?: string;
    role?: "assistant";
    finish?: boolean;
  }) => {
    if (isAborted()) return false;
    if (options.content) streamedChars += options.content.length;
    try {
      await writer.write(
        encoder.encode(formatOpenAIChunk({ id: chunkId, model, ...options }))
      );
      return true;
    } catch (err) {
      if (isClientAbort(err)) {
        closed = true;
        return false;
      }
      throw err;
    }
  };

  const finish = async () => {
    if (isAborted()) {
      await closeWriter();
      return;
    }
    await enqueue({ finish: true });
    try {
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (err) {
      if (!isClientAbort(err)) throw err;
    }
    await closeWriter();
  };

  void (async () => {
    let keepalive: ReturnType<typeof setInterval> | undefined;

    const stopKeepalive = () => {
      if (keepalive) {
        clearInterval(keepalive);
        keepalive = undefined;
      }
    };

    abortSignal.addEventListener("abort", stopKeepalive, { once: true });

    try {
      keepalive = setInterval(() => {
        if (isAborted()) {
          stopKeepalive();
          return;
        }
        void writer.write(encoder.encode(formatSSEKeepalive())).catch((err) => {
          if (isClientAbort(err)) {
            closed = true;
            stopKeepalive();
          }
        });
      }, KEEPALIVE_MS);

      let ctx =
        getCachedVoiceContext(session.conversationId) ??
        (await prepareAgentTurn({
          userId: session.userId,
          agentId: session.agentId,
          conversationId: session.conversationId,
        }));

      if (isAborted()) return;

      if (!ctx || ctx.conversationId !== session.conversationId) {
        stopKeepalive();
        await enqueue({
          role: "assistant",
          content: "Sorry, I couldn't load this conversation.",
        });
        await finish();
        return;
      }

      if (!getCachedVoiceContext(session.conversationId)) {
        ctx = {
          ...ctx,
          system: appendVoiceConversationGuidance(ctx.system),
        };
        cacheVoiceContext(session.conversationId, ctx);
      }

      const acknowledgment = await generateVoiceAcknowledgment({
        agentName: ctx.agent.name,
        userMessage: latestUser,
      });
      if (isAborted()) return;
      await enqueue({ role: "assistant", content: acknowledgment });

      const stored = await loadConversationUiMessages(ctx.conversationId);
      const lastStoredUser = [...stored].reverse().find((m) => m.role === "user");
      const lastStoredText = lastStoredUser ? uiMessageText(lastStoredUser) : "";
      if (latestUser !== lastStoredText) {
        await persistUserMessage(ctx, latestUser);
      }

      if (isAborted()) return;

      const result = await streamAgentTurn(ctx, uiMessages);
      let sentModelText = false;

      for await (const part of result.fullStream) {
        if (isAborted()) break;
        if (part.type === "text-delta" && part.text) {
          const ok = await enqueue({ content: part.text });
          if (!ok) break;
          sentModelText = true;
        }
      }

      if (!isAborted() && !sentModelText) {
        const finalText = (await result.text).trim();
        if (finalText) {
          await enqueue({ content: finalText });
          sentModelText = true;
        }
      }

      if (!isAborted() && !sentModelText) {
        await enqueue({ content: VOICE_EMPTY_FALLBACK });
      }

      stopKeepalive();
      if (!isAborted()) {
        await finish();
      } else {
        await closeWriter();
      }
    } catch (err) {
      stopKeepalive();
      if (isClientAbort(err) || isAborted()) {
        await closeWriter();
        return;
      }
      console.error("[elevenlabs/v1/chat/completions]", err);
      if (streamedChars === 0) {
        await enqueue({
          role: "assistant",
          content: "Sorry, something went wrong while I was working on that.",
        });
      } else {
        await enqueue({
          content: " Sorry, I hit an error finishing that request.",
        });
      }
      await finish();
    }
  })().catch(async (err) => {
    if (!isClientAbort(err)) {
      console.error("[elevenlabs/v1/chat/completions] unhandled", err);
    }
    await closeWriter();
  });

  return new Response(readable, { status: 200, headers: openAIStreamHeaders() });
}

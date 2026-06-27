import { randomUUID } from "node:crypto";

import { appendVoiceConversationGuidance } from "@/lib/agents/build-system-prompt";
import {
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
  findStoredAssistantReply,
  uiMessageText,
  type OpenAIChatMessage,
} from "@/lib/voice/openai-messages";
import {
  cacheVoiceContext,
  getActiveVoiceSession,
  getInFlightVoiceTurnResult,
  markVoiceIntroSpoken,
  registerInFlightVoiceTurnResult,
  releaseVoiceTurn,
  tryAcquireVoiceTurn,
  voiceTurnKey,
} from "@/lib/voice/session-cache";
import {
  verifyVoiceSessionToken,
  type VoiceSessionPayload,
} from "@/lib/voice/session-token";
import {
  sanitizeForSpeech,
  StreamingSpeechSanitizer,
} from "@/lib/voice/sanitize-speech";

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
  return streamSpokenResponseRaw(sanitizeForSpeech(text), model);
}

function streamSpokenResponseRaw(text: string, model = "monzi"): Response {
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
      latestUserPreview: latestUser.slice(0, 80) || null,
      messageCount: incoming.length,
      stream: wantsStream,
      userId: body.user_id ?? null,
    })
  );

  if (!session) {
    return streamSpokenResponseRaw(" ");
  }

  if (incoming.length === 0 || !latestUser) {
    // Greeting is spoken via ElevenLabs firstMessage override — stay silent here.
    markVoiceIntroSpoken(session.conversationId);
    return streamSpokenResponseRaw(" ");
  }

  const turnKey = voiceTurnKey(session.conversationId, latestUser);

  const inFlight = getInFlightVoiceTurnResult(turnKey);
  if (inFlight) {
    const text = sanitizeForSpeech(await inFlight);
    return text ? streamSpokenResponse(text) : streamSpokenResponseRaw(" ");
  }

  if (!tryAcquireVoiceTurn(turnKey)) {
    return streamSpokenResponseRaw(" ");
  }

  let resolveTurn!: (text: string) => void;
  const turnDone = new Promise<string>((resolve) => {
    resolveTurn = resolve;
  });
  registerInFlightVoiceTurnResult(turnKey, turnDone);

  const chunkId = `chatcmpl-${randomUUID()}`;
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const abortSignal = req.signal;

  let streamedChars = 0;
  let closed = false;
  let fullResponse = "";

  const isAborted = () => closed || abortSignal.aborted;

  const completeTurn = (text: string) => {
    resolveTurn(sanitizeForSpeech(text) || " ");
  };

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
    if (options.content) {
      streamedChars += options.content.length;
      fullResponse += options.content;
    }
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

      const ctx = await prepareAgentTurn({
        userId: session.userId,
        agentId: session.agentId,
        conversationId: session.conversationId,
      });

      if (isAborted()) {
        completeTurn(fullResponse);
        return;
      }

      if (!ctx || ctx.conversationId !== session.conversationId) {
        stopKeepalive();
        const msg = "Sorry, I couldn't load this conversation.";
        await enqueue({ role: "assistant", content: msg });
        await finish();
        completeTurn(msg);
        return;
      }

      ctx.system = appendVoiceConversationGuidance(ctx.system);
      cacheVoiceContext(session.conversationId, ctx);

      const stored = await loadConversationUiMessages(ctx.conversationId);
      const lastStoredUser = [...stored].reverse().find((m) => m.role === "user");
      const lastStoredText = lastStoredUser ? uiMessageText(lastStoredUser) : "";
      if (latestUser !== lastStoredText) {
        await persistUserMessage(ctx, latestUser);
      }

      const uiMessages = await loadConversationUiMessages(ctx.conversationId);

      const cachedReply = findStoredAssistantReply(uiMessages, latestUser);
      if (cachedReply) {
        stopKeepalive();
        const spoken = sanitizeForSpeech(cachedReply);
        await enqueue({ role: "assistant", content: spoken });
        await finish();
        completeTurn(spoken);
        return;
      }

      if (isAborted()) {
        completeTurn(fullResponse);
        return;
      }

      const result = await streamAgentTurn(ctx, uiMessages);
      let sentModelText = false;
      const speechSanitizer = new StreamingSpeechSanitizer();

      for await (const part of result.fullStream) {
        if (isAborted()) break;
        if (part.type === "text-delta" && part.text) {
          const spoken = speechSanitizer.push(part.text);
          if (!spoken) continue;
          const ok = await enqueue({ content: spoken });
          if (!ok) break;
          sentModelText = true;
        }
      }

      const trailing = speechSanitizer.flush();
      if (!isAborted() && trailing) {
        const ok = await enqueue({ content: trailing });
        if (ok) sentModelText = true;
      }

      if (!isAborted() && !sentModelText) {
        const finalText = sanitizeForSpeech((await result.text).trim());
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
      completeTurn(fullResponse.trim() || VOICE_EMPTY_FALLBACK);
    } catch (err) {
      stopKeepalive();
      if (isClientAbort(err) || isAborted()) {
        await closeWriter();
        completeTurn(fullResponse);
        return;
      }
      console.error("[elevenlabs/v1/chat/completions]", err);
      if (streamedChars === 0) {
        const msg = "Sorry, something went wrong while I was working on that.";
        await enqueue({ role: "assistant", content: sanitizeForSpeech(msg) });
        completeTurn(msg);
      } else {
        const suffix = " Sorry, I hit an error finishing that request.";
        await enqueue({ content: sanitizeForSpeech(suffix) });
        completeTurn(fullResponse + suffix);
      }
      await finish();
    } finally {
      releaseVoiceTurn(turnKey);
    }
  })().catch(async (err) => {
    if (!isClientAbort(err)) {
      console.error("[elevenlabs/v1/chat/completions] unhandled", err);
    }
    await closeWriter();
  });

  return new Response(readable, { status: 200, headers: openAIStreamHeaders() });
}

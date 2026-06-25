import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 60 * 60 * 1000;

export interface VoiceSessionPayload {
  userId: string;
  agentId: string;
  conversationId: string;
}

function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** Short-lived signed token binding a voice call to a user/agent/conversation. */
export function createVoiceSessionToken(
  secret: string,
  payload: VoiceSessionPayload
): string {
  const exp = Date.now() + TTL_MS;
  const body = JSON.stringify({ ...payload, exp });
  return `${Buffer.from(body).toString("base64url")}.${sign(secret, body)}`;
}

export function verifyVoiceSessionToken(
  secret: string,
  token: string
): VoiceSessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const bodyB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let body: string;
  try {
    body = Buffer.from(bodyB64, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = sign(secret, body);
  try {
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(body) as VoiceSessionPayload & { exp: number };
    if (!parsed.userId || !parsed.agentId || !parsed.conversationId) return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return {
      userId: parsed.userId,
      agentId: parsed.agentId,
      conversationId: parsed.conversationId,
    };
  } catch {
    return null;
  }
}

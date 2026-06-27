const OPENROUTER_PATTERN = /openrouter\.ai/i;

type ErrorLike = {
  message?: string;
  statusCode?: number;
  data?: { error?: { code?: number; message?: string } };
  cause?: unknown;
};

function collectErrorText(error: unknown, depth = 0): string {
  if (depth > 4 || error == null) return "";
  if (typeof error === "string") return error;

  if (error instanceof Error) {
    const parts = [error.message];
    if ("statusCode" in error && typeof error.statusCode === "number") {
      parts.push(String(error.statusCode));
    }
    if ("data" in error && error.data) {
      try {
        parts.push(JSON.stringify(error.data));
      } catch {
        // ignore circular refs
      }
    }
    if (error.cause) parts.push(collectErrorText(error.cause, depth + 1));
    return parts.filter(Boolean).join(" ");
  }

  if (typeof error === "object") {
    const e = error as ErrorLike;
    const parts = [
      e.message,
      e.data?.error?.message,
      e.statusCode != null ? String(e.statusCode) : "",
      e.data?.error?.code != null ? String(e.data.error.code) : "",
    ];
    if (e.cause) parts.push(collectErrorText(e.cause, depth + 1));
    return parts.filter(Boolean).join(" ");
  }

  return String(error);
}

function statusFromError(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const e = error as ErrorLike;
    if (typeof e.statusCode === "number") return e.statusCode;
    if (typeof e.data?.error?.code === "number") return e.data.error.code;
  }
  return undefined;
}

/** Map provider/API failures to safe, user-visible chat messages (no vendor names). */
export function formatAiErrorMessage(error: unknown): string {
  const text = collectErrorText(error).toLowerCase();
  const status = statusFromError(error);

  if (text.includes("energy credits")) {
    return "This agent has used all of its energy credits for this month. Increase the limit in agent settings or upgrade your plan.";
  }

  if (
    status === 402 ||
    text.includes("insufficient credits") ||
    text.includes("payment required") ||
    text.includes("quota exceeded") ||
    text.includes("billing")
  ) {
    return "Monzi couldn't generate a response right now because AI usage limits are reached. Please try again later.";
  }

  if (
    status === 429 ||
    text.includes("rate limit") ||
    text.includes("too many requests")
  ) {
    return "You've sent too many messages in a short time. Please wait a moment and try again.";
  }

  if (status === 401 || text.includes("invalid api key") || text.includes("unauthorized")) {
    return "Monzi couldn't connect to the AI service. Please contact support if this continues.";
  }

  if (
    status === 404 ||
    text.includes("no endpoints found")
  ) {
    return "The selected AI model is no longer available. Open agent settings and choose a different model.";
  }

  if (
    status === 400 &&
    (text.includes("maximum context length") ||
      text.includes("context length") ||
      text.includes("too many tokens"))
  ) {
    return "This conversation is too long for the selected model. Start a new chat or switch to a model with a larger context window.";
  }

  if (
    status === 503 ||
    status === 502 ||
    status === 504 ||
    text.includes("overloaded") ||
    text.includes("service unavailable")
  ) {
    return "The AI service is temporarily busy. Please try again in a few minutes.";
  }

  if (text.includes("abort") || text.includes("cancel")) {
    return "The request was cancelled.";
  }

  if (OPENROUTER_PATTERN.test(collectErrorText(error))) {
    return "Something went wrong while generating a response. Please try again.";
  }

  return "Something went wrong while generating a response. Please try again.";
}

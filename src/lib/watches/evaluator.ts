import { generateObject } from "ai";
import { z } from "zod";

import { resolveFastChatModel } from "@/lib/ai/openrouter";
import type { WatchCandidate, WatchEvaluationResult } from "@/lib/watches/types";

const evaluationSchema = z.object({
  match: z.boolean(),
  reason: z.string(),
  summary: z.string().describe("One sentence notification summary for the user"),
});

export async function evaluateWatchCandidate(
  conditionNl: string,
  candidate: WatchCandidate
): Promise<WatchEvaluationResult> {
  const model = await resolveFastChatModel();

  const { object } = await generateObject({
    model,
    schema: evaluationSchema,
    prompt: `You are evaluating whether an incoming item matches a user's watch condition.

Watch condition: "${conditionNl}"

Item:
- Title: ${candidate.title}
- Text: ${candidate.text}
- Timestamp: ${candidate.timestamp ?? "unknown"}
- Metadata: ${JSON.stringify(candidate.metadata).slice(0, 800)}

Return match=true only if this item clearly satisfies the watch condition.
Be conservative — avoid false positives.`,
  });

  return object;
}

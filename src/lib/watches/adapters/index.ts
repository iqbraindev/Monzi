import { adaptGenericCandidates } from "@/lib/watches/adapters/generic";
import { adaptGmailCandidates } from "@/lib/watches/adapters/gmail";
import type { WatchCandidate } from "@/lib/watches/types";

export type WatchAdapter = (raw: unknown) => WatchCandidate[];

const ADAPTERS: Record<string, WatchAdapter> = {
  gmail: adaptGmailCandidates,
  googlecalendar: adaptGenericCandidates,
  hubspot: adaptGenericCandidates,
  notion: adaptGenericCandidates,
  slack: adaptGenericCandidates,
};

export function normalizeWatchResult(
  toolkit: string,
  raw: unknown
): WatchCandidate[] {
  const slug = toolkit.toLowerCase();
  const adapter = ADAPTERS[slug] ?? adaptGenericCandidates;
  return adapter(raw);
}

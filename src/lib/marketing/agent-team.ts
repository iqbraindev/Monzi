import { AGENT_COLOR_OPTIONS } from "@/lib/agents/constants";

export const MARKETING_AGENT_TEAM = [
  {
    assetId: "avatar-01",
    label: "Nova",
    role: "Executive",
    description:
      "Runs your calendar, inbox, and priorities — so you stay focused on decisions, not admin.",
    color: AGENT_COLOR_OPTIONS[0],
  },
  {
    assetId: "avatar-02",
    label: "Pulse",
    role: "Sales",
    description:
      "Tracks pipeline, follow-ups, and deals across your CRM without missing a beat.",
    color: AGENT_COLOR_OPTIONS[4],
  },
  {
    assetId: "avatar-03",
    label: "Orbit",
    role: "Research",
    description:
      "Dig into data, summarize reports, and surface insights from your connected tools.",
    color: AGENT_COLOR_OPTIONS[1],
  },
  {
    assetId: "avatar-05",
    label: "Flux",
    role: "Operations",
    description:
      "Keeps workflows moving — tasks, automations, and coordination across your apps.",
    color: AGENT_COLOR_OPTIONS[5],
  },
  {
    assetId: "avatar-07",
    label: "Prism",
    role: "Creative",
    description:
      "Drafts content, shapes messaging, and turns rough ideas into polished output.",
    color: AGENT_COLOR_OPTIONS[3],
  },
] as const;

export const AGENT_CAROUSEL_SLOT_BY_OFFSET: Record<
  number,
  { rotateY: number; z: number; scale: number; zIndex: number }
> = {
  [-2]: { rotateY: 28, z: -48, scale: 0.88, zIndex: 10 },
  [-1]: { rotateY: 14, z: -20, scale: 0.94, zIndex: 20 },
  [0]: { rotateY: 0, z: 36, scale: 1.06, zIndex: 40 },
  [1]: { rotateY: -14, z: -20, scale: 0.94, zIndex: 20 },
  [2]: { rotateY: -28, z: -48, scale: 0.88, zIndex: 10 },
};

export const AGENT_CAROUSEL_AUTO_INTERVAL_MS = 4500;

export function getAgentCarouselOffset(
  index: number,
  active: number,
  length: number
): number {
  let offset = index - active;
  if (offset > 2) offset -= length;
  if (offset < -2) offset += length;
  return offset;
}

export function getAgentCarouselHeight(offset: number): number {
  if (offset === 0) return 220;
  if (Math.abs(offset) === 1) return 188;
  return 168;
}

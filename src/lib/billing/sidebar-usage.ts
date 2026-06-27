export type UsageUrgency = "ok" | "warning" | "critical" | "exhausted";

export interface LimitMetric {
  key: string;
  label: string;
  shortLabel: string;
  used: number;
  max: number;
  percent: number;
  unlimited: boolean;
}

export interface LimitsApiShape {
  limits?: {
    max_agents?: number;
    max_integrations?: number;
    ai_messages_per_month?: number;
  };
  usage?: {
    agents?: number;
    integrations?: number;
    ai_messages_used?: number;
  };
}

const NEXT_PLAN: Record<string, { slug: string; name: string }> = {
  free: { slug: "starter", name: "Starter" },
  starter: { slug: "pro", name: "Pro" },
  pro: { slug: "business", name: "Business" },
};

function metric(
  key: string,
  label: string,
  shortLabel: string,
  used: number,
  max: number
): LimitMetric | null {
  if (max < 0) return null;
  const safeMax = Math.max(max, 1);
  return {
    key,
    label,
    shortLabel,
    used,
    max,
    percent: Math.min(100, (used / safeMax) * 100),
    unlimited: false,
  };
}

export function buildLimitMetrics(data: LimitsApiShape | undefined): LimitMetric[] {
  if (!data?.limits || !data?.usage) return [];

  const candidates: (LimitMetric | null)[] = [
    metric(
      "messages",
      "messages",
      "msgs",
      data.usage.ai_messages_used ?? 0,
      data.limits.ai_messages_per_month ?? 50
    ),
    metric(
      "agents",
      "agents",
      "agents",
      data.usage.agents ?? 0,
      data.limits.max_agents ?? 1
    ),
    metric(
      "integrations",
      "integrations",
      "apps",
      data.usage.integrations ?? 0,
      data.limits.max_integrations ?? 1
    ),
  ];

  return candidates.filter((m): m is LimitMetric => m != null);
}

export function pickPrimaryMetric(metrics: LimitMetric[]): LimitMetric | null {
  if (metrics.length === 0) return null;
  return [...metrics].sort((a, b) => b.percent - a.percent)[0];
}

export function urgencyFromPercent(percent: number): UsageUrgency {
  if (percent >= 100) return "exhausted";
  if (percent >= 85) return "critical";
  if (percent >= 60) return "warning";
  return "ok";
}

export function upgradeMessage(
  primary: LimitMetric,
  nextPlanName: string
): string {
  if (primary.percent >= 100) {
    return `${primary.label.charAt(0).toUpperCase() + primary.label.slice(1)} limit reached`;
  }
  if (primary.key === "messages") {
    return `Running low on messages — upgrade for more`;
  }
  if (primary.key === "agents") {
    return `Need more agents? ${nextPlanName} unlocks more`;
  }
  if (primary.key === "integrations") {
    return `Connect more apps on ${nextPlanName}`;
  }
  return `Upgrade to ${nextPlanName}`;
}

export interface SidebarUsageState {
  planName: string;
  planSlug: string;
  primary: LimitMetric | null;
  urgency: UsageUrgency;
  nextPlanSlug: string | null;
  nextPlanName: string | null;
  nextPlanPrice: number | null;
  upgradeMessage: string | null;
  showUpgradeCta: boolean;
  showSoftExplore: boolean;
  canUpgrade: boolean;
}

export function computeSidebarUsageState(params: {
  limitsData: LimitsApiShape | undefined;
  planName: string;
  planSlug: string;
  nextPlanPrice?: number | null;
}): SidebarUsageState {
  const metrics = buildLimitMetrics(params.limitsData);
  const primary = pickPrimaryMetric(metrics);
  const urgency = primary ? urgencyFromPercent(primary.percent) : "ok";
  const next = NEXT_PLAN[params.planSlug] ?? null;
  const canUpgrade = next != null;

  const showUpgradeCta =
    canUpgrade && (urgency === "critical" || urgency === "exhausted");

  const showSoftExplore = false;

  let message: string | null = null;
  if (canUpgrade && primary) {
    if (urgency === "exhausted" || urgency === "critical") {
      message = upgradeMessage(primary, next!.name);
    } else if (urgency === "warning") {
      message = upgradeMessage(primary, next!.name);
    }
  }

  return {
    planName: params.planName,
    planSlug: params.planSlug,
    primary,
    urgency,
    nextPlanSlug: next?.slug ?? null,
    nextPlanName: next?.name ?? null,
    nextPlanPrice: params.nextPlanPrice ?? null,
    upgradeMessage: message,
    showUpgradeCta,
    showSoftExplore,
    canUpgrade,
  };
}

export function urgencyDotClass(urgency: UsageUrgency): string {
  switch (urgency) {
    case "exhausted":
      return "bg-aria-danger";
    case "critical":
      return "bg-aria-warning";
    case "warning":
      return "bg-amber-400";
    default:
      return "bg-aria-success";
  }
}

export function barClassForUrgency(urgency: UsageUrgency): string {
  switch (urgency) {
    case "exhausted":
      return "bg-aria-danger";
    case "critical":
      return "bg-aria-warning";
    case "warning":
      return "bg-amber-400";
    default:
      return "aria-gradient";
  }
}

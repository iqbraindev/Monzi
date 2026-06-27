import type { Integration } from "@/lib/aria/types";

/** Internal toolkit slug map for integration display names. */
export const INTEGRATION_TOOLKIT_MAP: Record<string, string> = {
  Gmail: "gmail",
  "Google Calendar": "googlecalendar",
  Notion: "notion",
  Slack: "slack",
  HubSpot: "hubspot",
  Stripe: "stripe",
  GitHub: "github",
  Asana: "asana",
  Salesforce: "salesforce",
  QuickBooks: "quickbooks",
  Linear: "linear",
  "Google Analytics": "googleanalytics",
  "Twitter / X": "twitter",
  Dropbox: "dropbox",
  Mailchimp: "mailchimp",
  Zoom: "zoom",
  HighLevel: "highlevel",
};

/** Visual metadata keyed by toolkit slug. */
export const TOOLKIT_CATALOG: Record<
  string,
  Pick<Integration, "name" | "glyph" | "bg" | "fg" | "category" | "desc" | "popular">
> = {
  gmail: {
    name: "Gmail",
    glyph: "M",
    bg: "#EA4335",
    fg: "#fff",
    category: "Communication",
    desc: "Sync emails, send replies, and manage your inbox.",
    popular: true,
  },
  googlecalendar: {
    name: "Google Calendar",
    glyph: "31",
    bg: "#1A73E8",
    fg: "#fff",
    category: "Productivity",
    desc: "See your schedule and let agents book meetings.",
    popular: true,
  },
  notion: {
    name: "Notion",
    glyph: "N",
    bg: "#111111",
    fg: "#fff",
    category: "Productivity",
    desc: "Read and update tasks, docs, and databases.",
    popular: true,
  },
  slack: {
    name: "Slack",
    glyph: "#",
    bg: "#4A154B",
    fg: "#fff",
    category: "Communication",
    desc: "Post updates and summarize channel activity.",
    popular: true,
  },
  hubspot: {
    name: "HubSpot",
    glyph: "H",
    bg: "#FF7A59",
    fg: "#fff",
    category: "CRM",
    desc: "Track deals, contacts, and pipeline stages.",
    popular: true,
  },
  stripe: {
    name: "Stripe",
    glyph: "S",
    bg: "#635BFF",
    fg: "#fff",
    category: "Finance",
    desc: "Pull revenue, invoices, and payout data.",
    popular: true,
  },
  github: {
    name: "GitHub",
    glyph: "G",
    bg: "#181717",
    fg: "#fff",
    category: "Development",
    desc: "Monitor issues, PRs, and repo activity.",
    popular: true,
  },
  asana: {
    name: "Asana",
    glyph: "A",
    bg: "#F06A6A",
    fg: "#fff",
    category: "Productivity",
    desc: "Manage projects, tasks, and assignees.",
    popular: true,
  },
  salesforce: {
    name: "Salesforce",
    glyph: "SF",
    bg: "#00A1E0",
    fg: "#fff",
    category: "CRM",
    desc: "Sync leads, opportunities, and accounts.",
    popular: false,
  },
  quickbooks: {
    name: "QuickBooks",
    glyph: "Q",
    bg: "#2CA01C",
    fg: "#fff",
    category: "Finance",
    desc: "Read invoices, expenses, and P&L reports.",
    popular: false,
  },
  linear: {
    name: "Linear",
    glyph: "L",
    bg: "#5E6AD2",
    fg: "#fff",
    category: "Development",
    desc: "Track issues, cycles, and product roadmap.",
    popular: false,
  },
  googleanalytics: {
    name: "Google Analytics",
    glyph: "GA",
    bg: "#E37400",
    fg: "#fff",
    category: "Analytics",
    desc: "Surface traffic, conversions, and trends.",
    popular: false,
  },
  twitter: {
    name: "Twitter / X",
    glyph: "X",
    bg: "#000000",
    fg: "#fff",
    category: "Social",
    desc: "Schedule posts and track engagement.",
    popular: false,
  },
  dropbox: {
    name: "Dropbox",
    glyph: "D",
    bg: "#0061FF",
    fg: "#fff",
    category: "Storage",
    desc: "Access files and share documents.",
    popular: false,
  },
  mailchimp: {
    name: "Mailchimp",
    glyph: "M",
    bg: "#FFE01B",
    fg: "#111111",
    category: "Analytics",
    desc: "Manage campaigns and audience stats.",
    popular: false,
  },
  zoom: {
    name: "Zoom",
    glyph: "Z",
    bg: "#2D8CFF",
    fg: "#fff",
    category: "Communication",
    desc: "Schedule calls and pull meeting recaps.",
    popular: false,
  },
  highlevel: {
    name: "HighLevel",
    glyph: "HL",
    bg: "#FF6B35",
    fg: "#fff",
    category: "CRM",
    desc: "Manage contacts, pipelines, calendars, and campaigns.",
    popular: true,
  },
};

export function toolkitFromIntegrationName(name: string): string | undefined {
  return INTEGRATION_TOOLKIT_MAP[name];
}

export function integrationNameFromToolkit(slug: string): string {
  return TOOLKIT_CATALOG[slug]?.name ?? slug;
}

export function catalogIntegrations(): Integration[] {
  return Object.entries(TOOLKIT_CATALOG).map(([toolkitSlug, meta]) => ({
    ...meta,
    toolkitSlug,
    connected: false,
  }));
}

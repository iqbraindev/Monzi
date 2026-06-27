import type {
  Agent,
  AgentInsight,
  CalendarEvent,
  DashboardTab,
  DashboardWidgetId,
  EmailItem,
  Integration,
  PipelineStage,
  TaskItem,
  TeamMember,
  WidgetOption,
} from "@/lib/aria/types";

const DEFAULT_VOICE = {
  provider: "openai" as const,
  voice_id: "nova",
  speed: 1.0,
  enabled: true,
};

export const AGENTS: Agent[] = [
  {
    id: "nova",
    name: "Nova",
    role: "Business Assistant",
    color: "#7C3AED",
    status: "active",
    conversations: 248,
    lastActive: "2h ago",
    apps: [
      { glyph: "M", color: "#EA4335", name: "Gmail" },
      { glyph: "N", color: "#111111", name: "Notion" },
      { glyph: "S", color: "#635BFF", name: "Stripe" },
    ],
    memories: [
      "You're based in NYC",
      "You prefer bullet points",
      "Working on the Acme project",
    ],
    capabilities: [
      "Read & draft emails in Gmail",
      "Track tasks and deadlines in Notion",
      "Pull revenue & invoices from Stripe",
      "Build dashboard widgets on request",
    ],
    voice: DEFAULT_VOICE,
    voiceAllowed: true,
    isDefault: true,
  },
  {
    id: "max",
    name: "Max",
    role: "Finance Advisor",
    color: "#06B6D4",
    status: "active",
    conversations: 132,
    lastActive: "1d ago",
    apps: [
      { glyph: "S", color: "#635BFF", name: "Stripe" },
      { glyph: "Q", color: "#2CA01C", name: "QuickBooks" },
    ],
    memories: [
      "You review finances every Monday",
      "Target margin is 40%",
      "Fiscal year starts in April",
    ],
    capabilities: [
      "Track revenue & expenses from Stripe",
      "Reconcile invoices in QuickBooks",
      "Forecast monthly cash flow",
      "Flag overdue payments",
    ],
    voice: DEFAULT_VOICE,
    voiceAllowed: true,
    isDefault: false,
  },
  {
    id: "alex",
    name: "Alex",
    role: "CRM & Clients",
    color: "#10B981",
    status: "inactive",
    conversations: 89,
    lastActive: "3d ago",
    apps: [
      { glyph: "H", color: "#FF7A59", name: "HubSpot" },
      { glyph: "M", color: "#EA4335", name: "Gmail" },
    ],
    memories: [
      "Acme Corp is the top account",
      "You follow up within 24h",
      "Prefers warm intros over cold outreach",
    ],
    capabilities: [
      "Manage deals across HubSpot stages",
      "Draft follow-up emails in Gmail",
      "Surface stale opportunities",
      "Summarize client conversations",
    ],
    voice: { ...DEFAULT_VOICE, enabled: false },
    voiceAllowed: true,
    isDefault: false,
  },
  {
    id: "ivy",
    name: "Ivy",
    role: "Content Creator",
    color: "#F59E0B",
    status: "active",
    conversations: 54,
    lastActive: "5h ago",
    apps: [
      { glyph: "N", color: "#111111", name: "Notion" },
      { glyph: "X", color: "#1DA1F2", name: "X" },
    ],
    memories: [
      "Brand voice is warm and concise",
      "Posts go out Tue & Thu mornings",
      "Avoid jargon in copy",
    ],
    capabilities: [
      "Draft posts and threads",
      "Repurpose long-form into snippets",
      "Plan a content calendar in Notion",
      "Suggest hooks and headlines",
    ],
    voice: DEFAULT_VOICE,
    voiceAllowed: true,
    isDefault: false,
  },
];

export function getAgent(id: string): Agent {
  return AGENTS.find((a) => a.id === id) ?? AGENTS[0];
}

/** Soft radial gradient used for an agent's avatar orb. */
export function agentGradient(color: string): string {
  return `radial-gradient(circle at 35% 30%, ${lighten(color)}, ${color} 70%)`;
}

/** Approximate lighter tint for the avatar highlight. */
function lighten(color: string): string {
  const tints: Record<string, string> = {
    "#7C3AED": "#A78BFA",
    "#06B6D4": "#67E8F9",
    "#10B981": "#6EE7B7",
    "#F59E0B": "#FCD34D",
    "#F43F5E": "#FDA4AF",
    "#6366F1": "#A5B4FC",
  };
  return tints[color] ?? "#FFFFFF";
}

export const DASHBOARD_TABS: DashboardTab[] = [
  { id: "morning", emoji: "🌅", name: "Morning Briefing" },
  { id: "work", emoji: "💼", name: "Work" },
  { id: "clients", emoji: "👥", name: "Clients" },
  { id: "finance", emoji: "💰", name: "Finance", agentCreated: true },
];

/** Widget layout per dashboard tab (mock data until backed by Supabase). */
export const DASHBOARD_LAYOUTS: Record<string, DashboardWidgetId[]> = {
  morning: ["email", "tasks", "calendar", "revenue", "pipeline", "insights", "add"],
  work: ["email", "tasks", "calendar", "insights", "add"],
  clients: ["pipeline", "email", "tasks", "insights", "add"],
  finance: ["revenue", "tasks", "pipeline", "insights", "add"],
};

export const EMAILS: EmailItem[] = [
  { id: "1", initials: "SL", color: "#7C3AED", name: "Sarah Lin · Meridian", subject: "Re: Contract renewal terms", time: "9:24a", unread: true },
  { id: "2", initials: "AC", color: "#06B6D4", name: "Acme Corp Billing", subject: "Invoice #204 is now overdue", time: "8:51a", unread: true },
  { id: "3", initials: "TR", color: "#10B981", name: "Tom Reyes", subject: "Quick question about onboarding", time: "8:02a", unread: true },
  { id: "4", initials: "GH", color: "#F59E0B", name: "GitHub", subject: "Your weekly digest", time: "Yest", unread: false },
  { id: "5", initials: "ST", color: "#6366F1", name: "Stripe", subject: "Payout of $4,820 completed", time: "Yest", unread: false },
];

export const TASKS: TaskItem[] = [
  { id: "1", name: "Send Acme Corp proposal", due: "Overdue", overdue: true, priority: "high", done: false },
  { id: "2", name: "Review Q2 invoices", due: "Today", overdue: false, priority: "medium", done: false },
  { id: "3", name: "Reply to Sarah at Meridian", due: "Today", overdue: false, priority: "medium", done: false },
  { id: "4", name: "Prep Thursday demo deck", due: "Jun 13", overdue: false, priority: "low", done: true },
  { id: "5", name: "Update pricing page copy", due: "Jun 14", overdue: false, priority: "low", done: false },
];

export const EVENTS: CalendarEvent[] = [
  { id: "1", time: "10:00 AM", title: "Standup with team", color: "#06B6D4" },
  { id: "2", time: "12:30 PM", title: "Acme Corp call", color: "#7C3AED", soon: true },
  { id: "3", time: "3:00 PM", title: "Design review", color: "#10B981" },
  { id: "4", time: "5:30 PM", title: "1:1 with Sarah", color: "#F59E0B" },
];

export const PIPELINE: PipelineStage[] = [
  { stage: "Lead", value: "$12k", count: 5, deals: [{ id: "1", name: "Northwind Co", color: "#06B6D4" }] },
  { stage: "Contacted", value: "$28k", count: 3, deals: [{ id: "2", name: "Meridian", color: "#7C3AED" }, { id: "3", name: "Tom Reyes", color: "#06B6D4" }] },
  { stage: "Proposal", value: "$45k", count: 2, deals: [{ id: "4", name: "Acme Corp", color: "#F59E0B" }], highlight: true },
  { stage: "Won", value: "$31k", count: 4, deals: [{ id: "5", name: "Globex", color: "#10B981" }] },
];

export const AGENT_INSIGHTS: AgentInsight[] = [
  { id: "1", icon: "📧", text: "3 emails need replies today", action: "Draft Replies" },
  { id: "2", icon: "💰", text: "Invoice #204 overdue 5 days", action: "Send Reminder" },
  { id: "3", icon: "📅", text: "Meeting with Acme Corp in 45 min", action: "Prep Summary" },
];

/** Smoothed revenue series for the last 30 days (0–100 scale, higher = more). */
export const REVENUE_SERIES: number[] = [
  21, 24, 22, 26, 30, 28, 33, 31, 36, 34, 40, 38, 44, 42, 48, 46, 52, 55, 58,
  62, 60, 66, 70, 68, 74, 78, 82, 80, 86, 92,
];

export const WIDGET_OPTIONS: WidgetOption[] = [
  { id: "email", name: "Email Inbox", logo: "M", logoColor: "#EA4335", description: "Live inbox feed with unread counts", connected: true },
  { id: "tasks", name: "Tasks", logo: "N", logoColor: "#111111", description: "Your Notion tasks and due dates", connected: true },
  { id: "calendar", name: "Calendar", logo: "31", logoColor: "#1A73E8", description: "Today's events and countdowns", connected: true },
  { id: "revenue", name: "Revenue", logo: "S", logoColor: "#635BFF", description: "Stripe revenue trends and totals", connected: true },
  { id: "pipeline", name: "Pipeline", logo: "H", logoColor: "#FF7A59", description: "HubSpot deals across stages", connected: true },
  { id: "slack", name: "Messages", logo: "#", logoColor: "#4A154B", description: "Slack channel activity — connect to use", connected: false, connectLabel: "Connect Slack" },
];

export const WIDGET_CATEGORIES = [
  "All",
  "Communication",
  "Tasks",
  "Finance",
  "Analytics",
  "Social",
];

export const INTEGRATIONS: Integration[] = [
  { name: "Gmail", glyph: "M", bg: "#EA4335", fg: "#fff", category: "Communication", desc: "Sync emails, send replies, and manage your inbox.", popular: true, connected: true },
  { name: "Google Calendar", glyph: "31", bg: "#1A73E8", fg: "#fff", category: "Productivity", desc: "See your schedule and let agents book meetings.", popular: true, connected: false },
  { name: "Notion", glyph: "N", bg: "#111111", fg: "#fff", category: "Productivity", desc: "Read and update tasks, docs, and databases.", popular: true, connected: true },
  { name: "Slack", glyph: "#", bg: "#4A154B", fg: "#fff", category: "Communication", desc: "Post updates and summarize channel activity.", popular: true, connected: false },
  { name: "HubSpot", glyph: "H", bg: "#FF7A59", fg: "#fff", category: "CRM", desc: "Track deals, contacts, and pipeline stages.", popular: true, connected: true },
  { name: "Stripe", glyph: "S", bg: "#635BFF", fg: "#fff", category: "Finance", desc: "Pull revenue, invoices, and payout data.", popular: true, connected: true },
  { name: "GitHub", glyph: "G", bg: "#181717", fg: "#fff", category: "Development", desc: "Monitor issues, PRs, and repo activity.", popular: true, connected: false },
  { name: "Asana", glyph: "A", bg: "#F06A6A", fg: "#fff", category: "Productivity", desc: "Manage projects, tasks, and assignees.", popular: true, connected: false },
  { name: "Salesforce", glyph: "SF", bg: "#00A1E0", fg: "#fff", category: "CRM", desc: "Sync leads, opportunities, and accounts.", popular: false, connected: false },
  { name: "QuickBooks", glyph: "Q", bg: "#2CA01C", fg: "#fff", category: "Finance", desc: "Read invoices, expenses, and P&L reports.", popular: false, connected: false },
  { name: "Linear", glyph: "L", bg: "#5E6AD2", fg: "#fff", category: "Development", desc: "Track issues, cycles, and product roadmap.", popular: false, connected: false },
  { name: "Google Analytics", glyph: "GA", bg: "#E37400", fg: "#fff", category: "Analytics", desc: "Surface traffic, conversions, and trends.", popular: false, connected: false },
  { name: "Twitter / X", glyph: "X", bg: "#000000", fg: "#fff", category: "Social", desc: "Schedule posts and track engagement.", popular: false, connected: false },
  { name: "Dropbox", glyph: "D", bg: "#0061FF", fg: "#fff", category: "Storage", desc: "Access files and share documents.", popular: false, connected: false },
  { name: "Mailchimp", glyph: "M", bg: "#FFE01B", fg: "#111111", category: "Analytics", desc: "Manage campaigns and audience stats.", popular: false, connected: false },
  { name: "Zoom", glyph: "Z", bg: "#2D8CFF", fg: "#fff", category: "Communication", desc: "Schedule calls and pull meeting recaps.", popular: false, connected: false },
];

export const INTEGRATION_CATEGORIES = [
  "All",
  "Communication",
  "Productivity",
  "CRM",
  "Finance",
  "Analytics",
  "Development",
  "Social",
  "Storage",
];

/** Default permissions an app requests when connecting, keyed by app name. */
export const INTEGRATION_PERMISSIONS: Record<string, string[]> = {
  "Google Calendar": ["Read your events and free/busy times", "Create and update calendar events", "Send meeting invites on your behalf"],
  Slack: ["Read messages in channels you choose", "Post messages and summaries", "See your workspace members"],
  GitHub: ["Read issues, pull requests, and repos", "Comment on issues and PRs", "See repository activity"],
  Asana: ["Read your projects and tasks", "Create and update tasks", "See assignees and due dates"],
  HighLevel: [
    "Read contacts, opportunities, and calendars",
    "Create and update leads and appointments",
    "Manage campaigns and conversations",
  ],
};

export const DEFAULT_INTEGRATION_PERMISSIONS = [
  "Read your data securely",
  "Take actions you approve",
  "Keep everything in sync",
];

export const TEAM_MEMBERS: TeamMember[] = [
  { id: "james", initials: "JR", avatar: "linear-gradient(135deg,#7C3AED,#A78BFA)", name: "James Rivera", email: "james@meridian.co", status: "active", agents: 2, dashboards: 1, lastActive: "12m ago", used: 45, limit: 200 },
  { id: "priya", initials: "PT", avatar: "linear-gradient(135deg,#06B6D4,#67E8F9)", name: "Priya Tan", email: "priya@acmecorp.com", status: "pending", agents: 1, dashboards: 1, lastActive: "—", used: 0, limit: 100 },
  { id: "marcus", initials: "MO", avatar: "linear-gradient(135deg,#F43F5E,#fb7185)", name: "Marcus Obi", email: "marcus@northwind.io", status: "suspended", agents: 3, dashboards: 2, lastActive: "8d ago", used: 188, limit: 200 },
];

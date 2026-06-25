export interface AppGlyph {
  glyph: string;
  color: string;
  name: string;
}

export interface AgentVoice {
  provider: "openai" | "elevenlabs" | "none";
  voice_id: string;
  speed: number;
  enabled: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  /** Hex base color used for the agent's aura / avatar gradient. */
  color: string;
  status: "active" | "inactive";
  conversations: number;
  lastActive: string;
  apps: AppGlyph[];
  memories: string[];
  capabilities: string[];
  voice: AgentVoice;
  /** Whether the user's subscription allows voice mode. */
  voiceAllowed: boolean;
}

export interface DashboardTab {
  id: string;
  emoji: string;
  name: string;
  /** Agent-created dashboards are flagged with a sparkle prefix. */
  agentCreated?: boolean;
}

export type DashboardWidgetId =
  | "email"
  | "tasks"
  | "calendar"
  | "revenue"
  | "pipeline"
  | "insights"
  | "add";

export interface EmailItem {
  id: string;
  initials: string;
  color: string;
  name: string;
  subject: string;
  time: string;
  unread: boolean;
}

export type TaskPriority = "high" | "medium" | "low";

export interface TaskItem {
  id: string;
  name: string;
  due: string;
  overdue: boolean;
  priority: TaskPriority;
  done: boolean;
}

export interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  color: string;
  soon?: boolean;
}

export interface PipelineStage {
  stage: string;
  value: string;
  count: number;
  deals: { id: string; name: string; color: string }[];
  highlight?: boolean;
}

export interface AgentInsight {
  id: string;
  icon: string;
  text: string;
  action: string;
}

export interface RevenuePoint {
  x: number;
  y: number;
}

export interface WidgetOption {
  id: string;
  name: string;
  logo: string;
  logoColor: string;
  description: string;
  connected: boolean;
  connectLabel?: string;
}

export interface Integration {
  name: string;
  /** Composio toolkit slug (e.g. gmail, notion). */
  toolkitSlug?: string;
  glyph: string;
  /** Background color for the logo tile. */
  bg: string;
  /** Foreground (text) color for the logo glyph. */
  fg: string;
  category: string;
  desc: string;
  popular: boolean;
  connected: boolean;
}

export type MemberStatus = "active" | "pending" | "suspended";

export interface TeamMember {
  id: string;
  initials: string;
  avatar: string;
  name: string;
  email: string;
  status: MemberStatus;
  agents: number;
  dashboards: number;
  lastActive: string;
  used: number;
  limit: number;
}

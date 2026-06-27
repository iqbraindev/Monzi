export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalSubaccounts: number;
  activeSubscriptions: number;
  mrr: number;
  totalAgents: number;
  aiMessagesThisMonth: number;
  aiTokensThisMonth: number;
  aiCostThisMonth: number;
  newUsersThisMonth: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  is_suspended: boolean;
  suspension_reason: string | null;
  created_at: string;
  pack_name: string | null;
  pack_slug: string | null;
  subscription_status: string | null;
  ai_messages_used: number;
  agents_count: number;
}

export interface UsageLeaderboardRow {
  user_id: string;
  email: string;
  full_name: string | null;
  ai_messages_used: number;
  ai_tokens_used: number;
  ai_cost_usd: number;
}

export interface BillingBreakdown {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  canceledThisMonth: number;
  revenueByPack: Array<{
    pack_name: string;
    pack_slug: string;
    count: number;
    mrr: number;
  }>;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  target_type: string | null;
  target_id: string | null;
  action: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface IntegrationFieldStatus {
  key: string;
  label: string;
  type: "secret" | "text";
  editable: boolean;
  placeholder?: string | null;
  configured: boolean;
  source: "db" | "env" | null;
  maskedPreview: string | null;
}

export interface IntegrationProviderStatus {
  id: string;
  label: string;
  description: string;
  docsUrl: string;
  editable: boolean;
  fields: IntegrationFieldStatus[];
  connection: { ok: boolean; error?: string };
}

export interface IntegrationsOverview {
  providers: IntegrationProviderStatus[];
  infrastructure: IntegrationProviderStatus[];
}

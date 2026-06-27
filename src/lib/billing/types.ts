export type BillingCycle = "monthly" | "yearly";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "incomplete";

export interface PackLimits {
  max_workspaces: number;
  max_agents: number;
  max_subaccounts: number;
  ai_messages_per_month: number;
  ai_messages_per_day: number;
  max_dashboards: number;
  max_widgets_per_dashboard: number;
  max_integrations: number;
  voice_enabled: boolean;
  custom_avatar_enabled: boolean;
  storage_mb: number;
  agent_energy_default: number;
  agent_energy_max: number;
  support_level: string;
}

export interface Pack {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  limits?: PackLimits;
}

export interface UsageSnapshot {
  ai_messages_used: number;
  ai_tokens_used: number;
  integrations_connected: number;
  agents_created: number;
  period_start: string;
  period_end: string;
}

export interface PaymentMethodInfo {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface BillingOverview {
  subscription: {
    status: SubscriptionStatus;
    billing_cycle: BillingCycle | null;
    current_period_start: string | null;
    current_period_end: string | null;
    trial_ends_at: string | null;
    canceled_at: string | null;
  };
  pack: Pick<Pack, "id" | "name" | "slug" | "description" | "price_monthly" | "price_yearly">;
  limits: PackLimits;
  usage: UsageSnapshot;
  paymentMethod: PaymentMethodInfo | null;
  availablePacks: Pack[];
}

export interface InvoiceRow {
  id: string;
  number: string | null;
  date: string;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

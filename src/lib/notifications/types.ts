export type NotificationType = "watch" | "insight" | "system";

export interface DbNotification {
  id: string;
  workspace_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  proactive: boolean;
}

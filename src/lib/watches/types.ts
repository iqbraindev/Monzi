export type WatchStatus = "active" | "paused" | "needs_connection" | "expired";
export type NotifyChannel = "in_app" | "push" | "email";
export type WatchCursorType = "timestamp" | "id";

export interface WatchCursor {
  type: WatchCursorType;
  value: string | null;
  field: string;
}

export interface DbAgentWatch {
  id: string;
  workspace_id: string;
  agent_id: string;
  created_by_user_id: string;
  title: string;
  condition_nl: string;
  toolkit: string;
  poll_tool: string;
  poll_params: Record<string, unknown>;
  cursor: WatchCursor;
  notify_via: NotifyChannel[];
  status: WatchStatus;
  expires_at: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface WatchCandidate {
  id: string;
  timestamp: string | null;
  title: string;
  text: string;
  metadata: Record<string, unknown>;
}

export interface WatchPlan {
  title: string;
  condition_nl: string;
  toolkit: string;
  poll_tool: string;
  poll_params: Record<string, unknown>;
  cursor: WatchCursor;
}

export interface WatchEvaluationResult {
  match: boolean;
  reason: string;
  summary: string;
}

export interface ConnectionGuardResult {
  connected: boolean;
  toolkit: string;
  appName: string;
  connectPath: string;
}

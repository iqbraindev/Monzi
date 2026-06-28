import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DbNotification } from "@/lib/notifications/types";

export interface NotificationBroadcastPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  watchId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

let devBroadcastSkipLogged = false;

function isRealtimeBroadcastEnabled(): boolean {
  if (process.env.NOTIFICATION_REALTIME_BROADCAST === "true") return true;
  if (process.env.NOTIFICATION_REALTIME_BROADCAST === "false") return false;
  return process.env.NODE_ENV === "production";
}

async function sendBroadcast(
  channelName: string,
  payload: NotificationBroadcastPayload
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const channel = supabase.channel(channelName);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Realtime subscribe timeout"));
    }, 3000);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        reject(new Error(`Realtime channel error (${status})`));
      }
    });
  });

  await channel.send({
    type: "broadcast",
    event: "notification:created",
    payload,
  });

  await supabase.removeChannel(channel);
}

export async function broadcastNotificationCreated(
  workspaceId: string,
  notification: DbNotification
): Promise<void> {
  if (!isRealtimeBroadcastEnabled()) {
    if (
      !devBroadcastSkipLogged &&
      process.env.NODE_ENV === "development"
    ) {
      devBroadcastSkipLogged = true;
      console.warn(
        "[notification broadcast] Skipping Supabase Realtime in development (set NOTIFICATION_REALTIME_BROADCAST=true to enable)."
      );
    }
    return;
  }

  const payload: NotificationBroadcastPayload = {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    watchId:
      typeof notification.metadata?.watch_id === "string"
        ? notification.metadata.watch_id
        : undefined,
    metadata: notification.metadata,
    createdAt: notification.created_at,
  };

  try {
    await sendBroadcast(`workspace:${workspaceId}`, payload);
  } catch (err) {
    console.warn("[notification broadcast]", workspaceId, err);
  }
}

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DashboardRealtimeEvent } from "@/lib/dashboard/types";

let devBroadcastSkipLogged = false;

function isRealtimeBroadcastEnabled(): boolean {
  if (process.env.DASHBOARD_REALTIME_BROADCAST === "true") return true;
  if (process.env.DASHBOARD_REALTIME_BROADCAST === "false") return false;
  return process.env.NODE_ENV === "production";
}

async function sendBroadcast(
  channelName: string,
  event: DashboardRealtimeEvent["event"],
  payload: DashboardRealtimeEvent["payload"]
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
    event,
    payload,
  });

  await supabase.removeChannel(channel);
}

/** Best-effort broadcast; never throws (local dev often has no Realtime). */
async function tryBroadcast(
  channelName: string,
  event: DashboardRealtimeEvent["event"],
  payload: DashboardRealtimeEvent["payload"]
): Promise<void> {
  if (!isRealtimeBroadcastEnabled()) {
    if (!devBroadcastSkipLogged && process.env.NODE_ENV === "development") {
      devBroadcastSkipLogged = true;
      console.info(
        "[dashboard broadcast] Skipping Supabase Realtime in development (set DASHBOARD_REALTIME_BROADCAST=true to enable)."
      );
    }
    return;
  }

  try {
    await sendBroadcast(channelName, event, payload);
  } catch (err) {
    console.warn("[dashboard broadcast]", channelName, event, err);
  }
}

export async function broadcastWidgetCreated(
  workspaceId: string,
  dashboardId: string,
  widget: import("@/lib/dashboard/types").DbWidget
): Promise<void> {
  const payload = { widget, dashboardId };
  await tryBroadcast(`workspace:${workspaceId}`, "widget:created", payload);
  await tryBroadcast(`dashboard:${dashboardId}`, "widget:created", payload);
}

export async function broadcastDashboardCreated(
  workspaceId: string,
  dashboard: import("@/lib/dashboard/types").DbDashboard,
  widgets: import("@/lib/dashboard/types").DbWidget[],
  autoSwitch = true
): Promise<void> {
  await tryBroadcast(`workspace:${workspaceId}`, "dashboard:created", {
    dashboard,
    widgets,
    autoSwitch,
  });
}

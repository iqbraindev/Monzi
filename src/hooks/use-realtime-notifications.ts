"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { DbNotification } from "@/lib/notifications/types";
import { useLimits } from "@/hooks/use-workspaces";

export interface NotificationBroadcastPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  watchId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function useNotifications() {
  const { data: limitsData } = useLimits();
  const workspaceId = limitsData?.workspaceId as string | undefined;
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=30", {
        headers: { "x-monzi-workspace-id": workspaceId },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: DbNotification[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!workspaceId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`workspace:${workspaceId}`)
      .on("broadcast", { event: "notification:created" }, ({ payload }) => {
        const item = payload as NotificationBroadcastPayload | undefined;
        if (!item) return;
        const notification: DbNotification = {
          id: item.id,
          workspace_id: workspaceId,
          user_id: "",
          type: item.type as DbNotification["type"],
          title: item.title,
          body: item.body,
          metadata: item.metadata ?? {},
          read_at: null,
          created_at: item.createdAt,
        };
        setNotifications((prev) => [notification, ...prev].slice(0, 50));
        setUnreadCount((c) => c + 1);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  const markRead = useCallback(
    async (id: string) => {
      if (!workspaceId) return;
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "x-monzi-workspace-id": workspaceId },
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    },
    [workspaceId]
  );

  const markAllRead = useCallback(async () => {
    if (!workspaceId) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-monzi-workspace-id": workspaceId,
      },
      body: JSON.stringify({ action: "read_all" }),
    });
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    setUnreadCount(0);
  }, [workspaceId]);

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
  };
}

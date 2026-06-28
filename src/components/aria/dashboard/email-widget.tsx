"use client";

import { useCallback, useState } from "react";
import { Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import type { EmailItem } from "@/lib/aria/types";
import {
  WidgetBadge,
  WidgetShell,
} from "@/components/aria/dashboard/widget-shell";
import {
  WidgetConnectCta,
  WidgetErrorState,
  WidgetLoadingState,
} from "@/components/aria/dashboard/widget-data-states";
import { EmailDetailModal } from "@/components/aria/dashboard/email-detail-modal";
import { useWidgetConnection } from "@/hooks/use-widget-connection";
import { useWidgetData } from "@/hooks/use-widget-data";

export function EmailWidget() {
  const queryClient = useQueryClient();
  const { toolkit, connected, isLoading: connLoading } = useWidgetConnection("email");
  const { data, isLoading, error, refetch, isError } = useWidgetData<{
    emails: EmailItem[];
  }>("email", { enabled: connected });

  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);

  const emails = data?.emails ?? [];
  const unread = emails.filter((e) => e.unread).length;
  const notConnected =
    (!connLoading && !connected) ||
    (isError &&
      (error as Error & { code?: string })?.code === "NOT_CONNECTED");

  const handleMarkedRead = useCallback(
    (messageId: string) => {
      queryClient.setQueryData(
        ["widget-data", "email"],
        (old: { data: { emails?: EmailItem[] }; tool?: string; widgetId?: string } | undefined) => {
          if (!old?.data?.emails) return old;
          return {
            ...old,
            data: {
              ...old.data,
              emails: old.data.emails.map((e) =>
                e.id === messageId ? { ...e, unread: false } : e
              ),
            },
          };
        }
      );
      setSelectedEmail((prev) =>
        prev?.id === messageId ? { ...prev, unread: false } : prev
      );
    },
    [queryClient]
  );

  return (
    <>
      <WidgetShell
        logo="M"
        logoColor="#EA4335"
        title="Inbox"
        span="lg:col-span-5"
        badge={
          connected && unread > 0 ? (
            <WidgetBadge tone="primary">{unread} unread</WidgetBadge>
          ) : undefined
        }
        footer={
          connected && !notConnected && !isLoading && emails.length > 0 ? (
            <div className="flex items-center justify-between px-4 py-3">
              <a className="cursor-pointer text-[13px] text-aria-text-secondary hover:text-aria-text">
                View all emails
              </a>
              <button className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-aria-border bg-aria-elevated px-3 text-xs font-semibold text-aria-primary-light transition-colors hover:border-aria-primary hover:bg-aria-primary/15">
                <Sparkles className="size-3.5" /> Summarize unread
              </button>
            </div>
          ) : undefined
        }
      >
        {(connLoading || (connected && isLoading)) && <WidgetLoadingState />}
        {notConnected && toolkit && (
          <WidgetConnectCta
            toolkit={toolkit}
            label="Connect Gmail to see your live inbox."
          />
        )}
        {connected && isError && !notConnected && (
          <WidgetErrorState
            message={error?.message ?? "Could not load emails"}
            onRetry={() => void refetch()}
          />
        )}
        {connected &&
          !isLoading &&
          !isError &&
          emails.length === 0 && (
            <div className="p-6 text-center text-sm text-aria-text-muted">
              No emails to show.
            </div>
          )}
        {connected &&
          !isLoading &&
          !isError &&
          emails.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedEmail(m)}
              className="flex w-full cursor-pointer items-center gap-3 border-b border-aria-border-subtle/60 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-aria-subtle/60"
              style={{
                background: m.unread ? "rgba(124,58,237,0.04)" : undefined,
              }}
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: m.color }}
              >
                {m.initials}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={`truncate text-[13px] ${m.unread ? "font-semibold text-aria-text" : "font-medium text-aria-text-secondary"}`}
                >
                  {m.name}
                </span>
                <span
                  className={`truncate text-xs ${m.unread ? "text-aria-text-secondary" : "text-aria-text-muted"}`}
                >
                  {m.subject}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="font-mono text-[11px] text-aria-text-muted">
                  {m.time}
                </span>
                {m.unread && (
                  <span className="size-[7px] rounded-full bg-aria-accent" />
                )}
              </span>
            </button>
          ))}
      </WidgetShell>

      <EmailDetailModal
        email={selectedEmail}
        live={connected && emails.length > 0}
        onClose={() => setSelectedEmail(null)}
        onMarkedRead={connected ? handleMarkedRead : undefined}
      />
    </>
  );
}

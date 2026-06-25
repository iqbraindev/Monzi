"use client";

import { Sparkles } from "lucide-react";

import { EMAILS } from "@/lib/aria/mock-data";
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
import { useWidgetData } from "@/hooks/use-widget-data";

export function EmailWidget() {
  const { data, isLoading, error, refetch, isError } = useWidgetData<{
    emails: EmailItem[];
  }>("email");

  const emails = data?.emails ?? [];
  const unread = emails.filter((e) => e.unread).length;
  const notConnected =
    isError &&
    (error as Error & { code?: string })?.code === "NOT_CONNECTED";

  return (
    <WidgetShell
      logo="M"
      logoColor="#EA4335"
      title="Inbox"
      span="lg:col-span-5"
      badge={<WidgetBadge tone="primary">{unread} unread</WidgetBadge>}
      footer={
        !notConnected && !isLoading ? (
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
      {isLoading && <WidgetLoadingState />}
      {notConnected && (
        <WidgetConnectCta
          toolkit="gmail"
          label="Connect Gmail to see your live inbox."
        />
      )}
      {isError && !notConnected && (
        <WidgetErrorState
          message={error?.message ?? "Could not load emails"}
          onRetry={() => void refetch()}
        />
      )}
      {!isLoading && !isError && emails.length === 0 && (
        <div className="p-6 text-center text-sm text-aria-text-muted">
          No emails to show.
        </div>
      )}
      {!isLoading &&
        !isError &&
        (emails.length ? emails : EMAILS).map((m) => (
          <div
            key={m.id}
            className="flex cursor-pointer items-center gap-3 border-b border-aria-border-subtle/60 px-4 py-2.5 transition-colors last:border-0 hover:bg-aria-subtle/60"
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
          </div>
        ))}
    </WidgetShell>
  );
}

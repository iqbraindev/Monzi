"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import type { EmailItem } from "@/lib/aria/types";
import type { GmailMessageDetail } from "@/lib/composio/gmail-message";
import { cn } from "@/lib/utils";

interface EmailDetailModalProps {
  email: EmailItem | null;
  live: boolean;
  onClose: () => void;
  onMarkedRead?: (messageId: string) => void;
}

export function EmailDetailModal({
  email,
  live,
  onClose,
  onMarkedRead,
}: EmailDetailModalProps) {
  const [detail, setDetail] = useState<GmailMessageDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setDetail(null);
      setError(null);
      return;

    }

    if (!live) {
      setDetail({
        id: email.id,
        from: email.name,
        subject: email.subject,
        date: email.time,
        bodyText: "Connect Gmail to read full message content.",
      });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);

    const load = async () => {
      try {
        if (email.unread) {
          void fetch(`/api/gmail/messages/${encodeURIComponent(email.id)}`, {
            method: "PATCH",
          }).then((res) => {
            if (res.ok) onMarkedRead?.(email.id);
          });
        }

        const res = await fetch(
          `/api/gmail/messages/${encodeURIComponent(email.id)}`
        );
        const data = (await res.json()) as {
          message?: GmailMessageDetail;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to load email");
        if (!cancelled) setDetail(data.message ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load email");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [email, live, onMarkedRead]);

  useEffect(() => {
    if (!email) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [email, onClose]);

  if (!email) return null;

  const displayFrom = detail?.from ?? email.name;
  const displaySubject = detail?.subject ?? email.subject;
  const displayDate = detail?.date ?? email.time;
  const fromLine = detail?.fromRaw ?? detail?.from ?? email.name;

  return (
    <div
      onClick={onClose}
      className="aria-pop fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6 backdrop-blur-[6px] sm:p-10"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[20px] border border-aria-border bg-aria-elevated/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start gap-3 border-b border-aria-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-semibold leading-snug text-aria-text">
              {displaySubject}
            </h2>
            <p className="mt-1 text-sm text-aria-text-secondary">
              From <span className="text-aria-text">{displayFrom}</span>
              {displayDate ? (
                <span className="text-aria-text-muted"> · {displayDate}</span>
              ) : null}
            </p>
            {detail?.to && (
              <p className="mt-0.5 text-xs text-aria-text-muted">To {detail.to}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-aria-subtle text-aria-text-secondary hover:text-aria-text"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-aria-text-secondary">
              <Loader2 className="size-4 animate-spin" />
              Loading message…
            </div>
          )}
          {error && (
            <p className="py-8 text-center text-sm text-aria-danger">{error}</p>
          )}
          {!loading && !error && detail && (
            <div className="space-y-4">
              {live && (
                <p className="text-xs text-aria-text-muted">{fromLine}</p>
              )}
              {detail.bodyHtml ? (
                <div
                  className={cn(
                    "prose prose-sm max-w-none text-aria-text",
                    "prose-headings:text-aria-text prose-p:text-aria-text-secondary prose-a:text-aria-primary-light"
                  )}
                  dangerouslySetInnerHTML={{ __html: detail.bodyHtml }}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-aria-text-secondary">
                  {detail.bodyText || detail.snippet || "No message body."}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

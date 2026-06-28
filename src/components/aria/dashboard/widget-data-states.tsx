"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { integrationFromToolkitSlug } from "@/lib/composio/toolkits";
import { useInvalidateComposioConnections } from "@/hooks/use-composio-connections";

export function WidgetConnectCta({
  toolkit,
  label,
}: {
  toolkit: string;
  label?: string;
}) {
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const invalidateConnections = useInvalidateComposioConnections();
  const queryClient = useQueryClient();
  const app = integrationFromToolkitSlug(toolkit);
  const appName = app?.name ?? toolkit;

  const connect = async () => {
    setConnecting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/composio/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkit }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Connection failed");
      }

      if (body.redirectUrl) {
        const returnPath = window.location.pathname + window.location.search;
        sessionStorage.setItem("monzi-connect-return", returnPath);
        document.cookie = `monzi-oauth-return=${encodeURIComponent(returnPath)}; path=/; max-age=600; SameSite=Lax`;
        window.location.href = body.redirectUrl as string;
        return;
      }

      invalidateConnections();
      await queryClient.invalidateQueries({ queryKey: ["widget-data"] });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm text-aria-text-secondary">
        {label ?? `Connect ${appName} to load live data in this widget.`}
      </p>
      <button
        type="button"
        onClick={() => void connect()}
        disabled={connecting}
        className="rounded-full border border-aria-primary/40 bg-aria-primary/15 px-4 py-2 text-xs font-semibold text-aria-primary-light transition-colors hover:bg-aria-primary/25 disabled:opacity-60"
      >
        {connecting ? "Connecting…" : `Connect ${appName}`}
      </button>
      <Link
        href="/integrations"
        className="text-[11px] font-medium text-aria-text-muted hover:text-aria-text-secondary"
      >
        Or manage in Integrations
      </Link>
      {errorMsg && (
        <p className="text-xs text-aria-danger">{errorMsg}</p>
      )}
    </div>
  );
}

export function WidgetLoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-aria-text-muted">
      Loading…
    </div>
  );
}

export function WidgetErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-sm text-aria-text-secondary">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold text-aria-primary-light hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";

import {
  BuilderField,
} from "@/components/aria/agents/builder/agent-builder-shell";
import {
  DEFAULT_INTEGRATION_PERMISSIONS,
  INTEGRATION_PERMISSIONS,
} from "@/lib/aria/mock-data";
import { IntegrationLogo } from "@/components/aria/integrations/integration-logo";
import type { Integration } from "@/lib/aria/types";
import { useComposioCatalog } from "@/hooks/use-composio-catalog";
import { filterComposioAppsForConnected } from "@/lib/composio/filter-apps";
import { getRolePreset } from "@/lib/agents/presets";
import { DRAFT_STORAGE_KEY } from "@/lib/agents/form-types";
import type { AgentBuilderDraft, BuilderPath } from "@/lib/agents/form-types";
import {
  useComposioConnections,
  useInvalidateComposioConnections,
} from "@/hooks/use-composio-connections";
import { cn } from "@/lib/utils";

interface AppConnectPanelProps {
  draft: AgentBuilderDraft;
  builderPath?: BuilderPath;
  agentId?: string;
  onToggleApp: (slug: string, enabled: boolean) => void;
  onSetComposioApps?: (apps: string[]) => void;
  onDraftPersist?: (draft: AgentBuilderDraft) => void;
}

export function AppConnectPanel({
  draft,
  builderPath,
  agentId,
  onToggleApp,
  onSetComposioApps,
  onDraftPersist,
}: AppConnectPanelProps) {
  const { data: connections = [], isLoading } = useComposioConnections();
  const { data: catalogApps = [], isLoading: catalogLoading } = useComposioCatalog();
  const invalidate = useInvalidateComposioConnections();
  const [modalApp, setModalApp] = useState<Integration | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const connectedSlugs = useMemo(
    () => new Set(connections.map((c) => c.toolkit)),
    [connections]
  );
  const connectedList = useMemo(
    () => Array.from(connectedSlugs),
    [connectedSlugs]
  );

  useEffect(() => {
    if (isLoading || !onSetComposioApps) return;
    const filtered = filterComposioAppsForConnected(
      draft.tools.composio_apps,
      connectedList
    );
    if (filtered.length !== draft.tools.composio_apps.length) {
      onSetComposioApps(filtered);
    }
  }, [
    isLoading,
    connectedList,
    draft.tools.composio_apps,
    onSetComposioApps,
  ]);

  const rolePreset = builderPath === "preset" ? getRolePreset(draft.role) : undefined;
  const suggested = new Set(rolePreset?.suggestedApps ?? []);
  const unconnectedSuggested = rolePreset
    ? rolePreset.suggestedApps.filter((slug) => !connectedSlugs.has(slug))
    : [];

  const catalog = useMemo(() => {
    const all = catalogApps.map((app) => ({
      ...app,
      connected: connectedSlugs.has(app.toolkitSlug ?? ""),
      suggested: suggested.has(app.toolkitSlug ?? ""),
    }));
    return all.sort((a, b) => {
      if (a.suggested !== b.suggested) return a.suggested ? -1 : 1;
      if (a.connected !== b.connected) return a.connected ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [catalogApps, connectedSlugs, suggested]);

  const startConnect = useCallback(
    async (app: Integration) => {
      if (!app.toolkitSlug) return;
      setConnecting(true);
      setErrorMsg("");

      if (onDraftPersist) {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      }

      const agentIds = agentId ? [agentId] : undefined;

      try {
        const res = await fetch("/api/composio/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toolkit: app.toolkitSlug,
            agentIds,
          }),
        });
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error ?? "Connection failed");
        }
        if (body.redirectUrl) {
          sessionStorage.setItem(
            "monzi-connect-return",
            window.location.pathname + window.location.search
          );
          document.cookie = `monzi-oauth-return=${encodeURIComponent(window.location.pathname + window.location.search)}; path=/; max-age=600; SameSite=Lax`;
          window.location.href = body.redirectUrl as string;
          return;
        }
        onToggleApp(app.toolkitSlug, true);
        invalidate();
        setModalApp(null);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Connection failed");
      } finally {
        setConnecting(false);
      }
    },
    [agentId, draft, invalidate, onDraftPersist, onToggleApp]
  );

  return (
    <div className="flex flex-col gap-4">
      {builderPath === "preset" && unconnectedSuggested.length > 0 && (
        <div className="rounded-[12px] border border-aria-primary/25 bg-aria-primary/8 px-4 py-3">
          <p className="text-sm font-medium text-aria-text">
            Connect recommended apps for {rolePreset?.label ?? "this role"}
          </p>
          <p className="mt-1 text-xs text-aria-text-secondary">
            These apps are suggested for your agent template but aren&apos;t
            connected yet. Connect below to enable them.
          </p>
        </div>
      )}

      <BuilderField
        label={
          builderPath === "preset"
            ? "Apps for this agent"
            : "Connected apps for this agent"
        }
        hint={
          builderPath === "preset"
            ? "Recommended apps are marked — connect and enable the ones you need"
            : "Toggle which connected apps this agent can use. Connect new apps inline."
        }
      >
        <span className="sr-only">App list below</span>
      </BuilderField>

      {isLoading || catalogLoading ? (
        <p className="text-sm text-aria-text-muted">Loading connections…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {catalog.map((app) => {
            const slug = app.toolkitSlug ?? "";
            const selected =
              app.connected && draft.tools.composio_apps.includes(slug);
            return (
              <div
                key={app.name}
                className={cn(
                  "flex flex-col gap-3 rounded-[14px] border p-4 transition-all",
                  selected
                    ? "border-aria-primary/35 bg-aria-primary/8"
                    : "border-aria-border bg-aria-surface/60"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <IntegrationLogo app={app} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-aria-text">
                        {app.name}
                      </span>
                      {app.suggested && builderPath === "preset" && (
                        <span className="rounded-full bg-aria-primary/15 px-2 py-0.5 text-[10px] font-semibold text-aria-primary-light">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-aria-text-secondary">
                      {app.desc}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {app.connected ? (
                    <button
                      type="button"
                      onClick={() => onToggleApp(slug, !selected)}
                      className={cn(
                        "h-8 flex-1 rounded-[9px] text-xs font-semibold transition-colors",
                        selected
                          ? "border border-aria-primary/40 bg-aria-primary/20 text-aria-primary-light"
                          : "border border-aria-border bg-aria-elevated text-aria-text-secondary"
                      )}
                    >
                      {selected ? "Remove from agent" : "Enable for agent"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setModalApp(app)}
                      className="h-8 flex-1 rounded-[9px] border border-aria-border bg-aria-elevated text-xs font-semibold text-aria-primary-light transition-colors hover:border-aria-primary"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalApp && (
        <div
          onClick={() => setModalApp(null)}
          className="aria-pop fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-8 backdrop-blur-[6px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] overflow-hidden rounded-[20px] border border-aria-border bg-aria-elevated/97 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-3 border-b border-aria-border px-5 py-4">
              <IntegrationLogo app={modalApp} size={40} />
              <div className="flex-1 font-heading text-base font-semibold text-aria-text">
                Connect {modalApp.name}
              </div>
              <button
                type="button"
                onClick={() => setModalApp(null)}
                className="flex size-8 items-center justify-center rounded-[9px] bg-aria-subtle text-aria-text-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 px-5 py-4">
              {(
                INTEGRATION_PERMISSIONS[modalApp.name] ??
                DEFAULT_INTEGRATION_PERMISSIONS
              ).map((p) => (
                <span
                  key={p}
                  className="flex items-start gap-2 text-[13px] text-aria-text-secondary"
                >
                  <Check className="mt-0.5 size-3.5 shrink-0 text-aria-success" />
                  {p}
                </span>
              ))}
              {errorMsg && (
                <p className="text-sm text-aria-danger">
                  {errorMsg}
                  {errorMsg.includes("Integration limit") && (
                    <>
                      {" "}
                      <Link href="/billing" className="underline">
                        Upgrade plan
                      </Link>
                    </>
                  )}
                </p>
              )}
              <button
                type="button"
                disabled={connecting}
                onClick={() => void startConnect(modalApp)}
                className="aria-gradient flex h-10 items-center justify-center gap-2 rounded-[11px] text-sm font-semibold text-white disabled:opacity-60"
              >
                {connecting && <Loader2 className="size-4 animate-spin" />}
                Connect with OAuth
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DEFAULT_INTEGRATION_PERMISSIONS,
  INTEGRATION_CATEGORIES,
  INTEGRATION_PERMISSIONS,
  agentGradient,
} from "@/lib/aria/mock-data";
import type { Integration } from "@/lib/aria/types";
import { IntegrationLogo } from "@/components/aria/integrations/integration-logo";
import { useComposioCatalog } from "@/hooks/use-composio-catalog";
import { integrationFromToolkitSlug } from "@/lib/composio/toolkits";
import { useAgents, useInvalidateAgents } from "@/hooks/use-agents";
import {
  useComposioConnections,
  useInvalidateComposioConnections,
} from "@/hooks/use-composio-connections";

type ModalStep = "form" | "loading" | "success" | "error";

export function IntegrationsView() {
  const searchParams = useSearchParams();
  const { data: connections = [], isLoading } = useComposioConnections();
  const invalidate = useInvalidateComposioConnections();
  const invalidateAgents = useInvalidateAgents();
  const { data: agents = [] } = useAgents();
  const { data: catalogApps = [], isLoading: catalogLoading } = useComposioCatalog();

  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [modalApp, setModalApp] = useState<Integration | null>(null);
  const [step, setStep] = useState<ModalStep>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<Record<string, boolean>>(
    {}
  );
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const repairedConnections = useRef(false);

  const connectedSlugs = useMemo(
    () => new Set(connections.map((c) => c.toolkit)),
    [connections]
  );

  const catalog = useMemo(() => {
    return catalogApps.map((app) => ({
      ...app,
      connected: connectedSlugs.has(app.toolkitSlug ?? ""),
    }));
  }, [catalogApps, connectedSlugs]);

  const connected = useMemo(() => {
    const catalogBySlug = new Map(
      catalogApps.map((app) => [app.toolkitSlug ?? "", app])
    );

    return connections.map((conn) => {
      const fromCatalog = catalogBySlug.get(conn.toolkit);
      if (fromCatalog) return { ...fromCatalog, connected: true };

      const fallback = integrationFromToolkitSlug(conn.toolkit, true);
      return (
        fallback ?? {
          name: conn.name,
          toolkitSlug: conn.toolkit,
          glyph: conn.name.slice(0, 1).toUpperCase(),
          bg: "#444444",
          fg: "#ffffff",
          category: "Other",
          desc: "",
          popular: false,
          connected: true,
        }
      );
    });
  }, [catalogApps, connections]);

  useEffect(() => {
    const slug = searchParams.get("connected");
    if (!slug) return;
    const app = catalog.find((a) => a.toolkitSlug === slug);
    if (app) {
      setModalApp(app);
      setStep("success");
      invalidate();

      const stored = sessionStorage.getItem("monzi-connect-agents");
      const agentIds = stored ? (JSON.parse(stored) as string[]) : undefined;
      sessionStorage.removeItem("monzi-connect-agents");

      void fetch("/api/composio/sync-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkit: slug, agentIds }),
      }).then(() => invalidateAgents());
    }
  }, [searchParams, catalog, invalidate, invalidateAgents]);

  useEffect(() => {
    if (repairedConnections.current || connections.length === 0) return;
    repairedConnections.current = true;
    void fetch("/api/composio/sync-agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncAll: true }),
    }).then(() => invalidateAgents());
  }, [connections.length, invalidateAgents]);

  useEffect(() => {
    if (agents.length && Object.keys(selectedAgents).length === 0) {
      setSelectedAgents(
        Object.fromEntries(agents.map((agent) => [agent.id, true]))
      );
    }
  }, [agents, selectedAgents]);

  const q = query.trim().toLowerCase();
  const filtered = catalog
    .filter((a) => activeCat === "All" || a.category === activeCat)
    .filter(
      (a) =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );

  const openConnect = (app: Integration) => {
    setModalApp(app);
    setStep("form");
    setErrorMsg("");
  };

  const startConnect = async () => {
    if (!modalApp?.toolkitSlug) return;
    setStep("loading");
    setErrorMsg("");

    const agentIds = Object.entries(selectedAgents)
      .filter(([, on]) => on)
      .map(([id]) => id);

    try {
      const res = await fetch("/api/composio/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolkit: modalApp.toolkitSlug,
          agentIds,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Connection failed");
      }

      if (body.redirectUrl) {
        sessionStorage.setItem(
          "monzi-connect-agents",
          JSON.stringify(agentIds)
        );
        window.location.href = body.redirectUrl as string;
        return;
      }

      setStep("success");
      invalidate();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Connection failed");
      setStep("error");
    }
  };

  const disconnect = async (connectionId: string) => {
    setDisconnecting(connectionId);
    try {
      const res = await fetch(`/api/composio/connections/${connectionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Disconnect failed");
      }
      invalidate();
    } finally {
      setDisconnecting(null);
    }
  };

  const closeModal = () => setModalApp(null);

  const connectionForApp = (app: Integration) =>
    connections.find((c) => c.toolkit === app.toolkitSlug);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-7 pt-7 pb-12">
      <div className="mb-6 flex flex-wrap items-end gap-5">
        <div className="min-w-60 flex-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-aria-text">
            Connected Apps
          </h1>
          <p className="mt-1.5 text-sm text-aria-text-secondary">
            Connect your tools and give your agents superpowers.
          </p>
        </div>
        <div className="flex h-[42px] w-80 max-w-full items-center gap-2.5 rounded-full border border-aria-border bg-aria-surface px-4 transition-all focus-within:border-aria-primary focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.14)]">
          <Search className="size-4 text-aria-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search integrations..."
            className="min-w-0 flex-1 bg-transparent text-sm text-aria-text outline-none placeholder:text-aria-text-muted"
          />
        </div>
      </div>

      <div className="mb-9">
        <div className="mb-3.5 flex items-center gap-2">
          <h2 className="font-heading text-[17px] font-semibold text-aria-text">
            Your connected apps
          </h2>
          <span className="rounded-full bg-aria-success/12 px-2.5 py-0.5 text-xs font-semibold text-aria-success">
            {connected.length} connected
          </span>
        </div>

        {isLoading || catalogLoading ? (
          <p className="text-sm text-aria-text-muted">Loading connections…</p>
        ) : connected.length === 0 ? (
          <p className="text-sm text-aria-text-muted">
            No apps connected yet. Pick one below to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {connected.map((app) => {
              const conn = connectionForApp(app);
              return (
                <div
                  key={app.name}
                  className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-aria-success/30 bg-aria-success/4 p-4 transition-transform hover:-translate-y-0.5"
                >
                  <div className="pointer-events-none absolute -top-[40%] -right-[20%] size-32 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.18),transparent_65%)] blur-2xl" />
                  <div className="relative flex items-center gap-2.5">
                    <IntegrationLogo app={app} size={38} />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-aria-text">
                        {app.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-aria-success">
                        <span className="size-1.5 rounded-full bg-aria-success shadow-[0_0_7px_#10B981]" />
                        Connected
                      </span>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-2">
                    <button
                      onClick={() => openConnect(app)}
                      className="h-8 flex-1 rounded-[9px] border border-aria-border bg-aria-elevated text-xs font-semibold text-aria-text transition-colors hover:border-aria-border"
                    >
                      Manage
                    </button>
                    <button
                      disabled={!conn || disconnecting === conn.id}
                      onClick={() => conn && disconnect(conn.id)}
                      className="h-8 rounded-[9px] border border-aria-danger/30 px-3 text-xs font-semibold text-aria-danger transition-colors hover:bg-aria-danger/10 disabled:opacity-50"
                    >
                      {disconnecting === conn?.id ? "…" : "Disconnect"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <h2 className="mr-2 font-heading text-[17px] font-semibold text-aria-text">
          Browse all integrations
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-aria-primary/30 bg-aria-primary/15 px-3 py-0.5 text-xs font-semibold text-aria-primary-light">
          ✨ {catalog.length} apps available
        </span>
      </div>

      <div className="mb-[18px] flex gap-2 overflow-x-auto pb-1">
        {INTEGRATION_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-all",
              cat === activeCat
                ? "border-aria-primary/40 bg-aria-primary/15 text-aria-primary-light"
                : "border-aria-border text-aria-text-secondary hover:text-aria-text"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-sm text-aria-text-muted">
          No integrations match “{query}”.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((app) => (
            <div
              key={app.name}
              className="flex flex-col gap-2.5 rounded-2xl border border-aria-border bg-aria-surface/70 p-4 backdrop-blur-md transition-transform hover:-translate-y-1"
            >
              <div className="flex items-start gap-2.5">
                <IntegrationLogo app={app} size={40} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-aria-text">
                      {app.name}
                    </span>
                    {app.popular && (
                      <span className="rounded-[5px] bg-aria-warning/16 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-300 uppercase">
                        Popular
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-aria-text-secondary">
                    {app.category}
                  </span>
                </div>
              </div>
              <p className="flex-1 text-xs leading-relaxed text-aria-text-secondary">
                {app.desc}
              </p>
              {app.connected ? (
                <span className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[9px] border border-aria-success/30 bg-aria-success/10 text-[13px] font-semibold text-aria-success">
                  <Check className="size-4" />
                  Connected
                </span>
              ) : (
                <button
                  onClick={() => openConnect(app)}
                  className="h-[34px] rounded-[9px] border border-aria-border bg-aria-elevated text-[13px] font-semibold text-aria-primary-light transition-all hover:border-aria-primary hover:bg-aria-primary/15"
                >
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modalApp && (
        <div
          onClick={closeModal}
          className="aria-pop fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-10 backdrop-blur-[6px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] overflow-hidden rounded-[20px] border border-aria-border bg-aria-elevated/97 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-3 border-b border-aria-border px-[22px] pt-[22px] pb-[18px]">
              <IntegrationLogo app={modalApp} size={46} radius={12} />
              <div className="min-w-0 flex-1">
                <div className="font-heading text-[17px] font-semibold text-aria-text">
                  Connect {modalApp.name}
                </div>
                <div className="text-xs text-aria-text-secondary">
                  secure connection to Monzi
                </div>
              </div>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-[9px] bg-aria-subtle text-aria-text-secondary transition-colors hover:text-aria-text"
              >
                <X className="size-4" />
              </button>
            </div>

            {step === "form" && (
              <div className="flex flex-col gap-[18px] px-[22px] py-[18px]">
                <div className="flex flex-col gap-2.5">
                  <span className="text-[11px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
                    Monzi will be able to
                  </span>
                  {(
                    INTEGRATION_PERMISSIONS[modalApp.name] ??
                    DEFAULT_INTEGRATION_PERMISSIONS
                  ).map((p) => (
                    <span
                      key={p}
                      className="flex items-start gap-2.5 text-[13px] leading-snug text-slate-300"
                    >
                      <Check className="mt-0.5 size-3.5 shrink-0 text-aria-success" />
                      {p}
                    </span>
                  ))}
                </div>
                <div className="flex flex-col gap-2.5">
                  <span className="text-[11px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
                    Which agents should use this?
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {agents.map((agent) => {
                      const on = !!selectedAgents[agent.id];
                      return (
                        <button
                          key={agent.id}
                          onClick={() =>
                            setSelectedAgents((prev) => ({
                              ...prev,
                              [agent.id]: !prev[agent.id],
                            }))
                          }
                          className={cn(
                            "flex h-[38px] items-center gap-2 rounded-full border py-0 pr-3 pl-1.5 text-[13px] font-semibold transition-all",
                            on
                              ? "border-aria-primary/45 bg-aria-primary/15 text-aria-text"
                              : "border-aria-border bg-[#16161f] text-aria-text-secondary"
                          )}
                        >
                          <span
                            className="size-6 rounded-full"
                            style={{
                              background: agentGradient(agent.color),
                              boxShadow: `0 0 10px ${agent.color}80`,
                            }}
                          />
                          {agent.name}
                          {on && (
                            <Check className="size-3.5 text-aria-primary-light" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => void startConnect()}
                  className="aria-gradient h-11 rounded-[11px] text-sm font-semibold text-white shadow-[0_6px_20px_rgba(124,58,237,0.3)] transition-[filter] hover:brightness-110"
                >
                  Connect with {modalApp.name}
                </button>
              </div>
            )}

            {step === "loading" && (
              <div className="flex flex-col items-center gap-4 px-[22px] py-12">
                <Loader2 className="size-10 animate-spin text-aria-primary" />
                <span className="text-sm text-aria-text-secondary">
                  Connecting to {modalApp.name}…
                </span>
              </div>
            )}

            {step === "error" && (
              <div className="flex flex-col items-center gap-3.5 px-[22px] py-10 text-center">
                <span className="text-sm text-aria-danger">{errorMsg}</span>
                {errorMsg.includes("Integration limit reached") && (
                  <p className="max-w-[320px] text-xs leading-relaxed text-aria-text-secondary">
                    Your plan includes a limited number of connected apps. Upgrade
                    to connect more, or disconnect an existing app first.
                  </p>
                )}
                <div className="flex gap-2.5">
                  {errorMsg.includes("Integration limit reached") && (
                    <Link
                      href="/billing"
                      className="h-10 rounded-[11px] border border-aria-primary/40 bg-aria-primary/15 px-5 text-sm font-semibold text-aria-primary-light transition-colors hover:bg-aria-primary/25"
                    >
                      Upgrade plan
                    </Link>
                  )}
                  <button
                    onClick={() => setStep("form")}
                    className="h-10 rounded-[11px] border border-aria-border bg-aria-elevated px-7 text-sm font-semibold text-aria-text"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="flex flex-col items-center gap-3.5 px-[22px] pt-[42px] pb-[26px]">
                <span className="aria-pop flex size-[58px] items-center justify-center rounded-full border border-aria-success/40 bg-aria-success/14 text-aria-success">
                  <Check className="size-7" strokeWidth={2.6} />
                </span>
                <span className="font-heading text-lg font-semibold text-aria-text">
                  {modalApp.name} connected
                </span>
                <span className="max-w-[280px] text-center text-[13px] text-aria-text-secondary">
                  Your selected agents can now use {modalApp.name}. It&rsquo;ll
                  appear in your dashboard shortly.
                </span>
                <button
                  onClick={closeModal}
                  className="mt-1.5 h-10 rounded-[11px] border border-aria-border bg-aria-elevated px-7 text-sm font-semibold text-aria-text transition-colors hover:border-aria-border"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

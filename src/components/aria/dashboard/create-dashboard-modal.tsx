"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { useInvalidateDashboards } from "@/hooks/use-dashboards";
import { useAgents } from "@/hooks/use-agents";
import { useConnectedToolkits } from "@/hooks/use-composio-connections";
import {
  DASHBOARD_PRESETS,
  type DashboardPreset,
} from "@/lib/dashboard/dashboard-presets";
import { getRegistryEntry, WIDGET_TOOLKIT } from "@/lib/dashboard/widget-registry";
import type { WidgetType } from "@/lib/dashboard/types";
import type { Agent } from "@/lib/aria/types";
import {
  setDashboardConnectionHintsFlag,
  type ConnectionHintItem,
} from "@/components/aria/dashboard/create-dashboard-connection-hints";

const ICON_OPTIONS = ["📊", "💼", "👥", "💰", "📅", "✨", "🎯", "📧"];

const PROMPT_EXAMPLES = [
  "Sales overview with pipeline and revenue",
  "My daily workflow — tasks, calendar, email",
  "Executive summary with insights",
];

type CreateMode = "describe" | "template";

export function CreateDashboardModal() {
  const open = useDashboardStore((s) => s.createModalOpen);
  const setOpen = useDashboardStore((s) => s.setCreateModalOpen);
  const setActiveDashboard = useDashboardStore((s) => s.setActiveDashboard);
  const invalidate = useInvalidateDashboards();
  const { data: agents = [] } = useAgents();
  const { toolkits } = useConnectedToolkits();

  const [mode, setMode] = useState<CreateMode>("describe");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📊");
  const [prompt, setPrompt] = useState("");
  const [agentId, setAgentId] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState(DASHBOARD_PRESETS[0].id);
  const [selectedWidgetTypes, setSelectedWidgetTypes] = useState<string[]>(
    DASHBOARD_PRESETS[0].widgets.map((w) => w.type)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPreset = useMemo(
    () => DASHBOARD_PRESETS.find((p) => p.id === selectedPresetId),
    [selectedPresetId]
  );

  const resolvedAgentId = agentId || agents[0]?.id || "";

  const selectPreset = (preset: DashboardPreset) => {
    setSelectedPresetId(preset.id);
    setName(preset.name);
    setIcon(preset.icon);
    setSelectedWidgetTypes(preset.widgets.map((w) => w.type));
  };

  const reset = () => {
    setMode("describe");
    setName("");
    setIcon("📊");
    setPrompt("");
    setAgentId(agents[0]?.id ?? "");
    setSelectedPresetId(DASHBOARD_PRESETS[0].id);
    setSelectedWidgetTypes(DASHBOARD_PRESETS[0].widgets.map((w) => w.type));
    setError(null);
  };

  const close = () => {
    if (submitting) return;
    setOpen(false);
    reset();
  };

  const finishCreate = (
    dashboardId: string,
    connectionHints: ConnectionHintItem[]
  ) => {
    invalidate();
    setActiveDashboard(dashboardId);
    setDashboardConnectionHintsFlag(connectionHints);
    close();
  };

  const submitDescribe = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || !resolvedAgentId || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/from-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: resolvedAgentId,
          prompt: trimmedPrompt,
          name: name.trim() || undefined,
          icon,
        }),
      });
      const data = (await res.json()) as {
        dashboardId?: string;
        connectionHints?: ConnectionHintItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to create dashboard");
      if (!data.dashboardId) throw new Error("Dashboard was not created");

      finishCreate(data.dashboardId, data.connectionHints ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  const submitTemplate = async () => {
    if (!selectedPreset || submitting) return;
    const trimmedName = name.trim() || selectedPreset.name;
    if (!trimmedName) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/from-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: selectedPreset.id,
          name: trimmedName,
          icon,
          widgetTypes: selectedWidgetTypes,
        }),
      });
      const data = (await res.json()) as {
        dashboard?: { id: string };
        connectionHints?: ConnectionHintItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to create dashboard");
      if (!data.dashboard?.id) throw new Error("Dashboard was not created");

      finishCreate(data.dashboard.id, data.connectionHints ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleWidgetType = (type: string) => {
    setSelectedWidgetTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const canSubmit =
    mode === "describe"
      ? prompt.trim().length > 0 && Boolean(resolvedAgentId)
      : Boolean(name.trim() || selectedPreset?.name);

  const selectedAgent = agents.find((a: Agent) => a.id === resolvedAgentId);

  if (!open) return null;

  return (
    <div
      onClick={close}
      className="aria-pop fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[20px] border border-aria-border bg-aria-elevated/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-3 border-b border-aria-border px-5 py-4">
          <span className="flex-1 font-heading text-lg font-semibold text-aria-text">
            New dashboard
          </span>
          <button
            onClick={close}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-[9px] bg-aria-subtle text-aria-text-secondary hover:text-aria-text"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="flex rounded-full border border-aria-border bg-aria-surface p-1">
            <button
              type="button"
              onClick={() => setMode("describe")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors",
                mode === "describe"
                  ? "bg-aria-primary/15 text-aria-primary-light"
                  : "text-aria-text-secondary hover:text-aria-text"
              )}
            >
              <Sparkles className="size-3.5" />
              Describe it
            </button>
            <button
              type="button"
              onClick={() => setMode("template")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors",
                mode === "template"
                  ? "bg-aria-primary/15 text-aria-primary-light"
                  : "text-aria-text-secondary hover:text-aria-text"
              )}
            >
              <span className="text-base">📋</span>
              Use a template
            </button>
          </div>

          {mode === "describe" ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-aria-text-secondary">
                  Agent
                </span>
                <select
                  value={resolvedAgentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="h-10 rounded-xl border border-aria-border bg-aria-surface px-3 text-sm text-aria-text outline-none focus:border-aria-primary/50"
                >
                  {agents.map((agent: Agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-aria-text-secondary">
                  What should this dashboard show?
                </span>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A sales command center with pipeline, revenue, and unread emails"
                  rows={4}
                  className="resize-none rounded-xl border border-aria-border bg-aria-surface px-3 py-2.5 text-sm text-aria-text outline-none focus:border-aria-primary/50"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {PROMPT_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="rounded-full border border-aria-border px-3 py-1 text-xs font-medium text-aria-text-secondary transition-colors hover:border-aria-primary/40 hover:text-aria-primary-light"
                  >
                    {example}
                  </button>
                ))}
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-aria-text-secondary">
                  Name (optional)
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Auto-suggested by agent"
                  className="h-10 rounded-xl border border-aria-border bg-aria-surface px-3 text-sm text-aria-text outline-none focus:border-aria-primary/50"
                />
              </label>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DASHBOARD_PRESETS.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    selected={preset.id === selectedPresetId}
                    onSelect={() => selectPreset(preset)}
                  />
                ))}
              </div>

              {selectedPreset && selectedPreset.widgets.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-aria-text-secondary">
                    Widgets to include
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {selectedPreset.widgets.map((widget) => {
                      const reg = getRegistryEntry(widget.type);
                      const toolkit = WIDGET_TOOLKIT[widget.type as WidgetType];
                      const connected = !toolkit || toolkits.has(toolkit);
                      const checked = selectedWidgetTypes.includes(widget.type);

                      return (
                        <label
                          key={widget.type}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-aria-border bg-aria-surface/60 px-3 py-2.5"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleWidgetType(widget.type)}
                            className="size-4 rounded border-aria-border"
                          />
                          <span className="flex-1 text-sm font-medium text-aria-text">
                            {reg?.defaultTitle ?? widget.type}
                          </span>
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              connected
                                ? "text-aria-success"
                                : "text-aria-warning"
                            )}
                          >
                            {connected ? "Connected" : "Connect later"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-aria-text-secondary">
                  Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-xl border border-aria-border bg-aria-surface px-3 text-sm text-aria-text outline-none focus:border-aria-primary/50"
                />
              </label>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-aria-text-secondary">
              Icon
            </span>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl border text-lg transition-colors",
                    icon === emoji
                      ? "border-aria-primary/50 bg-aria-primary/15"
                      : "border-aria-border bg-aria-surface hover:border-aria-primary/30"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-aria-danger">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-aria-border px-5 py-4">
          {submitting && mode === "describe" && selectedAgent ? (
            <p className="flex items-center gap-2 text-xs text-aria-text-muted">
              <Loader2 className="size-3.5 animate-spin" />
              {selectedAgent.name} is building your dashboard…
            </p>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              disabled={submitting}
              className="h-9 rounded-full px-4 text-sm font-medium text-aria-text-secondary hover:text-aria-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                void (mode === "describe" ? submitDescribe() : submitTemplate())
              }
              disabled={!canSubmit || submitting}
              className="h-9 rounded-full border border-aria-primary/40 bg-aria-primary/15 px-5 text-sm font-semibold text-aria-primary-light transition-colors hover:bg-aria-primary/25 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create dashboard"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: DashboardPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors",
        selected
          ? "border-aria-primary/50 bg-aria-primary/10"
          : "border-aria-border bg-aria-surface/60 hover:border-aria-primary/30"
      )}
    >
      <span className="text-lg">{preset.icon}</span>
      <span className="text-sm font-semibold text-aria-text">{preset.name}</span>
      <span className="text-xs leading-snug text-aria-text-secondary">
        {preset.description}
      </span>
      <span className="mt-1 text-[11px] font-medium text-aria-text-muted">
        {preset.widgets.length === 0
          ? "Empty dashboard"
          : `${preset.widgets.length} widgets`}
      </span>
    </button>
  );
}

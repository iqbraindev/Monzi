"use client";

import { useEffect } from "react";
import { MessageCircle, X } from "lucide-react";

import { AgentSidePanel } from "@/components/aria/agents/agent-side-panel";
import { AgentOrb } from "@/components/aria/agent-orb";
import { useAgents } from "@/hooks/use-agents";
import {
  readStoredActiveAgentId,
} from "@/lib/store/active-agent";
import { useUIStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

export function AgentAssistant() {
  const panelOpen = useUIStore((s) => s.agentPanelOpen);
  const setPanelOpen = useUIStore((s) => s.setAgentPanelOpen);
  const togglePanel = useUIStore((s) => s.toggleAgentPanel);
  const activeAgentId = useUIStore((s) => s.activeAgentId);
  const setActiveAgent = useUIStore((s) => s.setActiveAgent);
  const { data: agents = [] } = useAgents();

  useEffect(() => {
    const stored = readStoredActiveAgentId();
    if (stored) {
      setActiveAgent(stored);
      return;
    }

    void fetch("/api/agents/default")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { agentId?: string } | null) => {
        if (data?.agentId) setActiveAgent(data.agentId);
      })
      .catch(() => undefined);
  }, [setActiveAgent]);

  useEffect(() => {
    if (!activeAgentId && agents[0]) {
      setActiveAgent(agents[0].id);
    }
  }, [activeAgentId, agents, setActiveAgent]);

  const activeAgent =
    agents.find((a) => a.id === activeAgentId) ?? agents[0] ?? null;

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, setPanelOpen]);

  return (
    <>
      {panelOpen && (
        <div
          onClick={() => setPanelOpen(false)}
          className="fixed inset-0 z-[55] flex justify-end bg-black/40 backdrop-blur-[2px]"
        >
          <AgentSidePanel onClose={() => setPanelOpen(false)} />
        </div>
      )}

      <button
        type="button"
        onClick={togglePanel}
        aria-label={panelOpen ? "Close agent" : "Open agent"}
        className={cn(
          "aria-float fixed z-[56] flex size-14 items-center justify-center rounded-full text-white shadow-[0_8px_32px_rgba(124,58,237,0.45)] transition-all hover:scale-105 hover:brightness-110",
          panelOpen
            ? "bottom-6 right-[min(436px,calc(100vw-1.5rem))]"
            : "bottom-6 right-6",
          panelOpen ? "aria-gradient" : ""
        )}
        style={
          panelOpen
            ? undefined
            : activeAgent
              ? {
                  background: `linear-gradient(135deg, ${activeAgent.color}, ${activeAgent.color}cc)`,
                  boxShadow: `0 8px 32px ${activeAgent.color}66`,
                }
              : undefined
        }
      >
        {panelOpen ? (
          <X className="size-6" />
        ) : activeAgent ? (
          <AgentOrb color={activeAgent.color} size={36} />
        ) : (
          <MessageCircle className="size-6" />
        )}
      </button>
    </>
  );
}

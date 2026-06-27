"use client";

import { useEffect } from "react";
import { MessageCircle, X } from "lucide-react";

import { AgentSidePanel } from "@/components/aria/agents/agent-side-panel";
import { AgentAvatar } from "@/components/aria/agent-avatar";
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
          "aria-float fixed z-[56] transition-all",
          panelOpen
            ? "bottom-6 right-[min(436px,calc(100vw-1.5rem))] flex size-14 items-center justify-center rounded-full text-white shadow-[0_8px_32px_rgba(124,58,237,0.45)] hover:scale-105 hover:brightness-110 aria-gradient"
            : activeAgent
              ? "bottom-0 right-3 flex items-end justify-center border-0 bg-transparent p-0 hover:scale-[1.03] hover:brightness-110"
              : "bottom-6 right-6 flex size-14 items-center justify-center rounded-full text-white shadow-[0_8px_32px_rgba(124,58,237,0.45)] hover:scale-105 hover:brightness-110 aria-gradient"
        )}
      >
        {panelOpen ? (
          <X className="size-6" />
        ) : activeAgent ? (
          <AgentAvatar
            assetId={activeAgent.avatarAssetId}
            color={activeAgent.color}
            size={188}
            breathe
            neon
            variant="full"
            alt={`Chat with ${activeAgent.name}`}
          />
        ) : (
          <MessageCircle className="size-6" />
        )}
      </button>
    </>
  );
}

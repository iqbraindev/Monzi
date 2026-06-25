"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { AgentCard } from "@/components/aria/agents/agent-card";
import { CreateAgentModal } from "@/components/aria/agents/create-agent-modal";
import { useAgents, useInvalidateAgents } from "@/hooks/use-agents";

export function AgentsPageClient() {
  const searchParams = useSearchParams();
  const { data: agents = [], isLoading, error } = useAgents();
  const invalidateAgents = useInvalidateAgents();
  const [createOpen, setCreateOpen] = useState(false);

  const openCreate = useCallback(() => setCreateOpen(true), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-7 pt-7 pb-10">
      <div className="mb-6 flex flex-wrap items-end gap-5">
        <div className="min-w-60 flex-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-aria-text">
            My Agents
          </h1>
          <p className="mt-1.5 text-sm text-aria-text-secondary">
            Each agent is specialized for a different part of your life.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="aria-gradient inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-[18px] text-sm font-semibold text-white shadow-[0_6px_20px_rgba(124,58,237,0.3)] transition-[filter] hover:brightness-110"
          >
            <Plus className="size-4" />
            New Agent
          </button>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs text-aria-text-secondary">
              {agents.length} agents
            </span>
          </div>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-aria-text-muted">Loading agents…</p>
      )}
      {error && (
        <p className="text-sm text-aria-danger">
          {error instanceof Error ? error.message : "Failed to load agents"}
        </p>
      )}

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}

        <button
          type="button"
          onClick={openCreate}
          className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-aria-border text-aria-text-secondary transition-all hover:border-aria-primary hover:bg-aria-primary/5 hover:text-aria-primary-light"
        >
          <span className="flex size-[54px] items-center justify-center rounded-full border-[1.5px] border-current">
            <Plus className="size-5.5" />
          </span>
          <span className="text-[15px] font-semibold">Create a new agent</span>
          <span className="max-w-[180px] text-center text-xs text-aria-text-muted">
            Give them a name, a look, and a purpose.
          </span>
        </button>
      </div>

      {createOpen && (
        <CreateAgentModal
          onClose={closeCreate}
          onCreated={invalidateAgents}
        />
      )}
    </div>
  );
}

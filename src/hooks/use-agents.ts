import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { DbAgent } from "@/lib/agents/adapter";
import type { AgentBuilderDraft } from "@/lib/agents/form-types";
import type { Agent } from "@/lib/aria/types";

interface AgentsResponse {
  agents: Agent[];
  meta?: { count: number; limit: number };
}

interface AgentDetailResponse {
  agent: Agent;
  dbAgent: DbAgent;
}

async function fetchAgents(): Promise<AgentsResponse> {
  const res = await fetch("/api/agents");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load agents");
  }
  return (await res.json()) as AgentsResponse;
}

async function fetchAgent(id: string): Promise<AgentDetailResponse> {
  const res = await fetch(`/api/agents/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load agent");
  }
  return (await res.json()) as AgentDetailResponse;
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    staleTime: 30_000,
    select: (data) => data.agents,
  });
}

export function useAgentsMeta() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    staleTime: 30_000,
    select: (data) => data.meta ?? { count: data.agents.length, limit: -1 },
  });
}

export function useAgent(id: string | null) {
  return useQuery({
    queryKey: ["agents", id],
    queryFn: () => fetchAgent(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useInvalidateAgents() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["agents"] });
}

export function useRemoveAgentFromCache() {
  const qc = useQueryClient();
  return (id: string) => {
    qc.removeQueries({ queryKey: ["agents", id] });
    qc.invalidateQueries({ queryKey: ["agents"] });
  };
}

export async function createAgent(input: AgentBuilderDraft): Promise<Agent> {
  const res = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to create agent");
  }
  const data = (await res.json()) as { agent: Agent };
  return data.agent;
}

export async function updateAgent(
  id: string,
  input: Partial<AgentBuilderDraft> & { is_active?: boolean; composio_apps?: string[] }
): Promise<Agent> {
  const res = await fetch(`/api/agents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to update agent");
  }
  const data = (await res.json()) as { agent: Agent };
  return data.agent;
}

export async function deleteAgent(id: string): Promise<void> {
  const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to delete agent");
  }
}

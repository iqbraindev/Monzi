import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { Agent } from "@/lib/aria/types";

async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch("/api/agents");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load agents");
  }
  const data = (await res.json()) as { agents: Agent[] };
  return data.agents;
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    staleTime: 30_000,
  });
}

export function useInvalidateAgents() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["agents"] });
}

export interface CreateAgentInput {
  name: string;
  role: string;
  color: string;
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
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

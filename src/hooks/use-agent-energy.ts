import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { AgentEnergyStats } from "@/lib/billing/energy";

async function fetchAgentEnergy(agentId: string): Promise<AgentEnergyStats> {
  const res = await fetch(`/api/agents/${agentId}/energy`);
  if (!res.ok) throw new Error("Failed to load energy stats");
  return (await res.json()) as AgentEnergyStats;
}

export function useAgentEnergy(agentId: string) {
  return useQuery({
    queryKey: ["agent-energy", agentId],
    queryFn: () => fetchAgentEnergy(agentId),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useInvalidateAgentEnergy() {
  const qc = useQueryClient();
  return (agentId: string) =>
    qc.invalidateQueries({ queryKey: ["agent-energy", agentId] });
}

export function usePlanEnergyLimits() {
  return useQuery({
    queryKey: ["plan-energy-limits"],
    queryFn: async () => {
      const res = await fetch("/api/billing/energy-limits");
      if (!res.ok) throw new Error("Failed to load plan limits");
      return (await res.json()) as {
        defaultMonthly: number;
        maxMonthly: number;
      };
    },
    staleTime: 60_000,
  });
}

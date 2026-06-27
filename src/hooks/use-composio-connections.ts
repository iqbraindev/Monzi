"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useLimits } from "@/hooks/use-workspaces";

export interface ComposioConnection {
  id: string;
  toolkit: string;
  name: string;
  status: string;
}

async function fetchConnections(): Promise<ComposioConnection[]> {
  const res = await fetch("/api/composio/connections");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load connections");
  }
  const data = (await res.json()) as { connections: ComposioConnection[] };
  return data.connections;
}

export function useComposioConnections() {
  const { data: limitsData } = useLimits();
  const workspaceId = limitsData?.workspaceId as string | undefined;

  return useQuery({
    queryKey: ["composio-connections", workspaceId],
    queryFn: fetchConnections,
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });
}

export function useInvalidateComposioConnections() {
  const qc = useQueryClient();
  const { data: limitsData } = useLimits();
  const workspaceId = limitsData?.workspaceId as string | undefined;

  return () =>
    qc.invalidateQueries({
      queryKey: ["composio-connections", workspaceId],
    });
}

export function useConnectedToolkits() {
  const { data, ...rest } = useComposioConnections();
  const toolkits = new Set((data ?? []).map((c) => c.toolkit));
  return { toolkits, connections: data ?? [], ...rest };
}

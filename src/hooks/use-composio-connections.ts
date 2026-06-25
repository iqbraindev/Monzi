import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  return useQuery({
    queryKey: ["composio-connections"],
    queryFn: fetchConnections,
    staleTime: 30_000,
  });
}

export function useInvalidateComposioConnections() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["composio-connections"] });
}

export function useConnectedToolkits() {
  const { data, ...rest } = useComposioConnections();
  const toolkits = new Set((data ?? []).map((c) => c.toolkit));
  return { toolkits, connections: data ?? [], ...rest };
}

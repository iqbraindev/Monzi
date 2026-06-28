"use client";

import { useQuery } from "@tanstack/react-query";

import type { Integration } from "@/lib/aria/types";

async function fetchComposioCatalog(): Promise<Integration[]> {
  const res = await fetch("/api/composio/catalog");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load integrations catalog");
  }
  const data = (await res.json()) as { apps: Integration[] };
  return data.apps;
}

export function useComposioCatalog() {
  return useQuery({
    queryKey: ["composio", "catalog"],
    queryFn: fetchComposioCatalog,
    staleTime: 60_000,
  });
}

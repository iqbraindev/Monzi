"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useWorkspaceStore } from "@/lib/store/workspace-store";
import type { WorkspaceWithRole } from "@/lib/workspaces/types";

interface WorkspacesResponse {
  workspaces: WorkspaceWithRole[];
  meta: {
    ownedCount: number;
    maxWorkspaces: number;
  };
}

async function fetchWorkspaces(): Promise<WorkspacesResponse> {
  const res = await fetch("/api/workspaces");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load workspaces");
  }
  return res.json();
}

async function switchWorkspace(workspaceId: string) {
  const res = await fetch(`/api/workspaces/${workspaceId}/switch`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to switch workspace");
  }
  return res.json();
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string | null;
  activity_domain?: string | null;
  logo?: File | null;
}

async function createWorkspace(input: CreateWorkspaceInput) {
  const res = await fetch("/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      activity_domain: input.activity_domain,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw body;
  }

  const workspace = (body as { workspace: WorkspaceWithRole }).workspace;

  if (input.logo) {
    const formData = new FormData();
    formData.append("logo", input.logo);
    const logoRes = await fetch(`/api/workspaces/${workspace.id}/logo`, {
      method: "POST",
      body: formData,
    });
    if (!logoRes.ok) {
      const logoBody = await logoRes.json().catch(() => ({}));
      throw new Error(logoBody.error ?? "Workspace created but logo upload failed");
    }
  }

  return body as { workspace: WorkspaceWithRole };
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
    staleTime: 30_000,
  });
}

export function useSwitchWorkspace() {
  const qc = useQueryClient();
  const setActive = useWorkspaceStore((s) => s.setActiveWorkspaceId);

  return useMutation({
    mutationFn: switchWorkspace,
    onSuccess: (data) => {
      setActive(data.workspace?.id ?? data.context?.workspaceId ?? null);
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
      void qc.invalidateQueries({ queryKey: ["limits"] });
      void qc.invalidateQueries({ queryKey: ["agents"] });
      void qc.invalidateQueries({ queryKey: ["dashboards"] });
      void qc.invalidateQueries({ queryKey: ["composio-connections"] });
      window.location.reload();
    },
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  const switchMutation = useSwitchWorkspace();

  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["workspaces"] });
      await switchMutation.mutateAsync(data.workspace.id);
    },
  });
}

export function useLimits() {
  return useQuery({
    queryKey: ["limits"],
    queryFn: async () => {
      const res = await fetch("/api/limits");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load limits");
      }
      return res.json();
    },
    staleTime: 30_000,
  });
}

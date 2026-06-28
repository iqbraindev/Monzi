"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface SubaccountMember {
  userId: string;
  role: string;
  createdAt: string;
  status: "active" | "pending" | "suspended";
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  permissions: {
    allowedAgentIds: string[];
    allowedDashboardIds: string[];
    aiMessagesMonthlyLimit: number;
  } | null;
}

interface SubaccountsResponse {
  members: Array<{
    userId: string;
    role: string;
    createdAt: string;
    status: SubaccountMember["status"];
    user: {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
      is_active: boolean;
    } | null;
    permissions: SubaccountMember["permissions"];
  }>;
}

export interface InviteMemberInput {
  email: string;
  fullName?: string;
  allowedAgentIds: string[];
  allowedDashboardIds: string[];
  aiMessagesMonthlyLimit?: number;
}

export interface UpdateMemberInput {
  userId: string;
  allowedAgentIds?: string[];
  allowedDashboardIds?: string[];
  aiMessagesMonthlyLimit?: number;
  suspended?: boolean;
}

function mapMember(row: SubaccountsResponse["members"][number]): SubaccountMember {
  return {
    userId: row.userId,
    role: row.role,
    createdAt: row.createdAt,
    status: row.status,
    email: row.user?.email ?? "Unknown",
    fullName: row.user?.full_name ?? null,
    avatarUrl: row.user?.avatar_url ?? null,
    permissions: row.permissions,
  };
}

async function fetchSubaccounts(): Promise<SubaccountMember[]> {
  const res = await fetch("/api/subaccounts");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load team members");
  }
  const data = (await res.json()) as SubaccountsResponse;
  return (data.members ?? []).map(mapMember);
}

export function useSubaccounts() {
  return useQuery({
    queryKey: ["subaccounts"],
    queryFn: fetchSubaccounts,
    staleTime: 15_000,
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InviteMemberInput) => {
      const res = await fetch("/api/subaccounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to invite member");
      return body;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["subaccounts"] });
      void qc.invalidateQueries({ queryKey: ["limits"] });
    },
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMemberInput) => {
      const res = await fetch(`/api/subaccounts/${input.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to update member");
      return body;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["subaccounts"] });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/subaccounts/${userId}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to remove member");
      return body;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["subaccounts"] });
      void qc.invalidateQueries({ queryKey: ["limits"] });
    },
  });
}

"use client";

import { useMemo, useState } from "react";
import { Loader2, MoreHorizontal, Plus, X } from "lucide-react";

import { AgentAvatar } from "@/components/aria/agent-avatar";
import { useAgents } from "@/hooks/use-agents";
import { useDashboards } from "@/hooks/use-dashboards";
import {
  useInviteMember,
  useRemoveMember,
  useSubaccounts,
  useUpdateMember,
  type SubaccountMember,
} from "@/hooks/use-subaccounts";
import { useLimits } from "@/hooks/use-workspaces";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/aria/types";
import type { DashboardWithWidgets } from "@/lib/dashboard/types";

const STATUS_MAP = {
  active: { label: "Active", color: "#10B981", bg: "rgba(16,185,129,.12)" },
  pending: { label: "Pending invite", color: "#F59E0B", bg: "rgba(245,158,11,.12)" },
  suspended: { label: "Suspended", color: "#EF4444", bg: "rgba(239,68,68,.12)" },
} as const;

function initialsFor(member: SubaccountMember): string {
  const source = member.fullName?.trim() || member.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function avatarColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 45%)`;
}

function SubaccountSeatMeter({ onInvite }: { onInvite: () => void }) {
  const { data: limitsData } = useLimits();
  const used = limitsData?.usage?.subaccounts ?? 0;
  const max = limitsData?.limits?.max_subaccounts ?? 0;
  const unlimited = max < 0;
  const ratio = unlimited || max === 0 ? 0 : used / max;

  return (
    <>
      <button
        type="button"
        onClick={onInvite}
        className="aria-gradient inline-flex h-10 items-center gap-2 rounded-full px-[18px] text-sm font-semibold text-white shadow-[0_6px_20px_rgba(124,58,237,0.3)] transition-[filter] hover:brightness-110"
      >
        <Plus className="size-4" />
        Invite Member
      </button>
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-xs text-aria-text-secondary">
          {unlimited ? `${used} seats used` : `${used} of ${max} seats used`}
        </span>
        {!unlimited && max > 0 && (
          <span className="inline-block h-[5px] w-[90px] overflow-hidden rounded-full bg-aria-subtle">
            <span
              className="aria-gradient block h-full rounded-full"
              style={{ width: `${Math.min(100, ratio * 100)}%` }}
            />
          </span>
        )}
      </div>
    </>
  );
}

export function SubaccountsView() {
  const { data: members = [], isLoading, error } = useSubaccounts();
  const { data: limitsData } = useLimits();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<SubaccountMember | null>(null);

  const canManage =
    limitsData?.memberRole === "owner" || limitsData?.memberRole === "admin";

  if (!canManage && limitsData) {
    return (
      <div className="mx-auto max-w-xl px-7 pt-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-aria-text">
          Team access only
        </h1>
        <p className="mt-3 text-sm text-aria-text-secondary">
          You can use the agents and dashboards shared with you in this workspace.
          Only workspace owners can manage team members.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1080px] px-7 pt-7 pb-12">
      <div className="mb-6 flex flex-wrap items-end gap-5">
        <div className="min-w-60 flex-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-aria-text">
            Team Members
          </h1>
          <p className="mt-1.5 text-sm text-aria-text-secondary">
            Invite people to use your agents and dashboards. They cannot create
            agents, connect apps, or edit dashboards.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SubaccountSeatMeter onInvite={() => setInviteOpen(true)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-aria-border bg-aria-surface/70 backdrop-blur-md">
        <div className="grid grid-cols-[2.2fr_1.3fr_1fr_44px] items-center gap-3 border-b border-aria-border bg-[#16161f] px-[18px] py-3 max-md:hidden">
          {["Member", "Access", "Status", ""].map((h, i) => (
            <span
              key={i}
              className="text-[11px] font-semibold tracking-[0.05em] text-aria-text-secondary uppercase"
            >
              {h}
            </span>
          ))}
        </div>

        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-aria-text-muted" />
          </div>
        )}

        {error && (
          <div className="px-[18px] py-8 text-sm text-aria-danger">
            {error instanceof Error ? error.message : "Failed to load members"}
          </div>
        )}

        {!isLoading && !error && members.length === 0 && (
          <div className="px-[18px] py-10 text-center text-sm text-aria-text-secondary">
            No team members yet. Invite someone to give them access to your agents
            and dashboards.
          </div>
        )}

        {members.map((member) => {
          const status = STATUS_MAP[member.status];
          const agentCount = member.permissions?.allowedAgentIds.length ?? 0;
          const dashboardCount =
            member.permissions?.allowedDashboardIds.length ?? 0;

          return (
            <div
              key={member.userId}
              className="grid grid-cols-1 items-center gap-3 border-b border-[#16161f] px-[18px] py-3.5 transition-colors hover:bg-white/[0.018] md:grid-cols-[2.2fr_1.3fr_1fr_44px]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex size-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                  style={{ background: avatarColor(member.email) }}
                >
                  {initialsFor(member)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-aria-text">
                    {member.fullName || member.email.split("@")[0]}
                  </span>
                  <span className="truncate text-xs text-aria-text-secondary">
                    {member.email}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-aria-text">
                  {agentCount} {agentCount === 1 ? "agent" : "agents"}
                </span>
                <span className="text-[11px] text-aria-text-muted">
                  {dashboardCount}{" "}
                  {dashboardCount === 1 ? "dashboard" : "dashboards"}
                </span>
              </div>
              <span
                className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ color: status.color, background: status.bg }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: status.color }}
                />
                {status.label}
              </span>
              <button
                type="button"
                onClick={() => setEditMember(member)}
                aria-label="Edit member"
                className="flex size-[34px] items-center justify-center justify-self-start rounded-[9px] border border-aria-border bg-aria-elevated text-aria-text-secondary transition-colors hover:text-aria-text md:justify-self-end"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </div>
          );
        })}
      </div>

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
      {editMember && (
        <EditModal member={editMember} onClose={() => setEditMember(null)} />
      )}
    </div>
  );
}

function AccessPicker({
  agents,
  dashboards,
  selectedAgents,
  selectedDashboards,
  onToggleAgent,
  onToggleDashboard,
}: {
  agents: Agent[];
  dashboards: DashboardWithWidgets[];
  selectedAgents: Record<string, boolean>;
  selectedDashboards: Record<string, boolean>;
  onToggleAgent: (id: string) => void;
  onToggleDashboard: (id: string) => void;
}) {
  return (
    <>
      <Field label="Which agents can they use?">
        {agents.length === 0 ? (
          <p className="text-xs text-aria-text-muted">No agents in this workspace yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {agents.map((agent) => {
              const on = !!selectedAgents[agent.id];
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onToggleAgent(agent.id)}
                  className={cn(
                    "flex h-[38px] items-center gap-2 rounded-full border py-0 pr-3 pl-1.5 text-[13px] font-semibold transition-all",
                    on
                      ? "border-aria-primary/45 bg-aria-primary/15 text-aria-text"
                      : "border-aria-border bg-[#16161f] text-aria-text-secondary"
                  )}
                >
                  <AgentAvatar
                    assetId={agent.avatarAssetId}
                    color={agent.color}
                    size={24}
                    alt={agent.name}
                  />
                  {agent.name}
                </button>
              );
            })}
          </div>
        )}
      </Field>

      <Field label="Which dashboards can they view?">
        {dashboards.length === 0 ? (
          <p className="text-xs text-aria-text-muted">No dashboards in this workspace yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dashboards.map((dashboard) => {
              const on = !!selectedDashboards[dashboard.id];
              return (
                <button
                  key={dashboard.id}
                  type="button"
                  onClick={() => onToggleDashboard(dashboard.id)}
                  className={cn(
                    "inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-all",
                    on
                      ? "border-aria-accent/40 bg-aria-accent/15 text-aria-text"
                      : "border-aria-border bg-[#16161f] text-aria-text-secondary"
                  )}
                >
                  {dashboard.icon ?? "📊"} {dashboard.name}
                </button>
              );
            })}
          </div>
        )}
      </Field>
    </>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const { data: agents = [] } = useAgents();
  const { data: dashboards = [] } = useDashboards();
  const inviteMember = useInviteMember();

  const [email, setEmail] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<Record<string, boolean>>({});
  const [selectedDashboards, setSelectedDashboards] = useState<Record<string, boolean>>({});
  const [limit, setLimit] = useState(200);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Email is required");
      return;
    }

    try {
      await inviteMember.mutateAsync({
        email: trimmed,
        allowedAgentIds: Object.keys(selectedAgents).filter((id) => selectedAgents[id]),
        allowedDashboardIds: Object.keys(selectedDashboards).filter(
          (id) => selectedDashboards[id]
        ),
        aiMessagesMonthlyLimit: limit,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    }
  };

  return (
    <ModalShell title="Invite a team member" onClose={onClose}>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-[22px] py-[18px]">
        <Field label="Email address">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="h-[42px] w-full rounded-[11px] border border-aria-border bg-aria-surface px-3.5 text-sm text-aria-text outline-none transition-all focus:border-aria-primary focus:shadow-[0_0_0_3px_rgba(124,58,237,0.14)]"
          />
        </Field>

        <AccessPicker
          agents={agents}
          dashboards={dashboards}
          selectedAgents={selectedAgents}
          selectedDashboards={selectedDashboards}
          onToggleAgent={(id) =>
            setSelectedAgents((prev) => ({ ...prev, [id]: !prev[id] }))
          }
          onToggleDashboard={(id) =>
            setSelectedDashboards((prev) => ({ ...prev, [id]: !prev[id] }))
          }
        />

        <Field label="Monthly message limit">
          <div className="flex items-center justify-between">
            <span className="text-xs text-aria-text-secondary">Messages</span>
            <span className="font-mono text-[13px] font-bold text-aria-primary-light">
              {limit} msgs
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={500}
            step={10}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="accent-aria-primary w-full"
          />
        </Field>

        <p className="text-xs leading-relaxed text-aria-text-muted">
          Members can chat with assigned agents and view assigned dashboards only.
          They cannot create agents, connect integrations, or modify dashboards.
          The same person can be invited to multiple workspaces by different owners.
        </p>

        {error && <p className="text-sm text-aria-danger">{error}</p>}
      </div>

      <ModalFooter
        onClose={onClose}
        onSubmit={submit}
        submitLabel={inviteMember.isPending ? "Sending…" : "Send Invite"}
        disabled={inviteMember.isPending}
      />
    </ModalShell>
  );
}

function EditModal({
  member,
  onClose,
}: {
  member: SubaccountMember;
  onClose: () => void;
}) {
  const { data: agents = [] } = useAgents();
  const { data: dashboards = [] } = useDashboards();
  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();

  const initialAgents = useMemo(() => {
    const ids = member.permissions?.allowedAgentIds ?? [];
    return Object.fromEntries(ids.map((id) => [id, true]));
  }, [member.permissions?.allowedAgentIds]);

  const initialDashboards = useMemo(() => {
    const ids = member.permissions?.allowedDashboardIds ?? [];
    return Object.fromEntries(ids.map((id) => [id, true]));
  }, [member.permissions?.allowedDashboardIds]);

  const [selectedAgents, setSelectedAgents] = useState(initialAgents);
  const [selectedDashboards, setSelectedDashboards] = useState(initialDashboards);
  const [limit, setLimit] = useState(
    member.permissions?.aiMessagesMonthlyLimit ?? 200
  );
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      await updateMember.mutateAsync({
        userId: member.userId,
        allowedAgentIds: Object.keys(selectedAgents).filter((id) => selectedAgents[id]),
        allowedDashboardIds: Object.keys(selectedDashboards).filter(
          (id) => selectedDashboards[id]
        ),
        aiMessagesMonthlyLimit: limit,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
  };

  const remove = async () => {
    const confirmed = window.confirm(
      `Remove ${member.email} from this workspace? They will lose access to your agents and dashboards here.`
    );
    if (!confirmed) return;

    try {
      await removeMember.mutateAsync(member.userId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const suspend = async () => {
    const suspending = member.status !== "suspended";
    try {
      await updateMember.mutateAsync({
        userId: member.userId,
        suspended: suspending,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update member");
    }
  };

  const displayName = member.fullName || member.email.split("@")[0];

  return (
    <ModalShell title={`Edit ${displayName}`} onClose={onClose}>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-[22px] py-[18px]">
        <div className="flex items-center gap-3 rounded-[11px] border border-aria-border-subtle bg-[#16161f] px-3.5 py-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
            style={{ background: avatarColor(member.email) }}
          >
            {initialsFor(member)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-aria-text">
              {displayName}
            </p>
            <p className="truncate text-xs text-aria-text-secondary">
              {member.email}
            </p>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              color: STATUS_MAP[member.status].color,
              background: STATUS_MAP[member.status].bg,
            }}
          >
            {STATUS_MAP[member.status].label}
          </span>
        </div>

        <AccessPicker
          agents={agents}
          dashboards={dashboards}
          selectedAgents={selectedAgents}
          selectedDashboards={selectedDashboards}
          onToggleAgent={(id) =>
            setSelectedAgents((prev) => ({ ...prev, [id]: !prev[id] }))
          }
          onToggleDashboard={(id) =>
            setSelectedDashboards((prev) => ({ ...prev, [id]: !prev[id] }))
          }
        />

        <Field label="Monthly message limit">
          <div className="flex items-center justify-between">
            <span className="text-xs text-aria-text-secondary">Messages</span>
            <span className="font-mono text-[13px] font-bold text-aria-primary-light">
              {limit} msgs
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={500}
            step={10}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="accent-aria-primary w-full"
          />
        </Field>

        <div className="flex flex-col gap-2.5 rounded-[13px] border border-aria-danger/30 bg-aria-danger/4 p-3.5">
          <span className="text-[11px] font-semibold tracking-[0.08em] text-aria-danger uppercase">
            Danger zone
          </span>
          <button
            type="button"
            onClick={() => void suspend()}
            className="h-[38px] rounded-[10px] border border-aria-warning/40 text-[13px] font-semibold text-aria-warning transition-colors hover:bg-aria-warning/10"
          >
            {member.status === "suspended" ? "Restore access" : "Suspend access"}
          </button>
          <button
            type="button"
            onClick={() => void remove()}
            className="h-[38px] rounded-[10px] border border-aria-danger/40 text-[13px] font-semibold text-aria-danger transition-colors hover:bg-aria-danger/10"
          >
            Remove member
          </button>
        </div>

        {error && <p className="text-sm text-aria-danger">{error}</p>}
      </div>

      <ModalFooter
        onClose={onClose}
        onSubmit={() => void save()}
        submitLabel={updateMember.isPending ? "Saving…" : "Save changes"}
        disabled={updateMember.isPending}
      />
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      className="aria-pop fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-8 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[20px] border border-aria-border bg-aria-elevated/97 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-3 border-b border-aria-border px-[22px] pt-5 pb-4">
          <span className="flex-1 font-heading text-lg font-semibold text-aria-text">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-[9px] bg-aria-subtle text-aria-text-secondary transition-colors hover:text-aria-text"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({
  onClose,
  onSubmit,
  submitLabel,
  disabled,
}: {
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2.5 border-t border-aria-border px-[22px] py-4">
      <button
        type="button"
        onClick={onClose}
        className="h-[42px] rounded-[11px] border border-aria-border px-[18px] text-sm font-semibold text-aria-text-secondary transition-colors hover:text-aria-text"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="aria-gradient h-[42px] flex-1 rounded-[11px] text-sm font-semibold text-white shadow-[0_6px_20px_rgba(124,58,237,0.3)] transition-[filter] hover:brightness-110 disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function Field({
  label,
  upper,
  children,
}: {
  label: string;
  upper?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span
        className={cn(
          "font-semibold text-aria-text-secondary",
          upper
            ? "text-[11px] tracking-[0.08em] text-aria-text-muted uppercase"
            : "text-xs"
        )}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

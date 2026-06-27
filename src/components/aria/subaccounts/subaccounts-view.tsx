"use client";

import { useState } from "react";
import { MoreHorizontal, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLimits } from "@/hooks/use-workspaces";
import { AGENTS, TEAM_MEMBERS, agentGradient } from "@/lib/aria/mock-data";
import type { MemberStatus, TeamMember } from "@/lib/aria/types";

const STATUS_MAP: Record<
  MemberStatus,
  { label: string; color: string; bg: string }
> = {
  active: { label: "Active", color: "#10B981", bg: "rgba(16,185,129,.12)" },
  pending: { label: "Pending invite", color: "#F59E0B", bg: "rgba(245,158,11,.12)" },
  suspended: { label: "Suspended", color: "#EF4444", bg: "rgba(239,68,68,.12)" },
};

const DASHBOARDS = [
  { name: "Work", emoji: "💼" },
  { name: "Clients", emoji: "👥" },
  { name: "Finance", emoji: "💰" },
];

const PERMISSIONS = [
  { key: "agents", label: "Can create agents" },
  { key: "integrations", label: "Can connect integrations" },
  { key: "dashboards", label: "Can edit dashboards" },
];

function usageColor(ratio: number) {
  if (ratio >= 0.9) return "#EF4444";
  if (ratio >= 0.7) return "#F59E0B";
  return "#7C3AED";
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
        onClick={onInvite}
        className="aria-gradient inline-flex h-10 items-center gap-2 rounded-full px-[18px] text-sm font-semibold text-white shadow-[0_6px_20px_rgba(124,58,237,0.3)] transition-[filter] hover:brightness-110"
      >
        <Plus className="size-4" />
        Invite Member
      </button>
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-xs text-aria-text-secondary">
          {unlimited
            ? `${used} seats used`
            : `${used} of ${max} seats used`}
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-7 pt-7 pb-12">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end gap-5">
        <div className="min-w-60 flex-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-aria-text">
            Team Members
          </h1>
          <p className="mt-1.5 text-sm text-aria-text-secondary">
            Give your team or clients access to specific agents and dashboards.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SubaccountSeatMeter onInvite={() => setInviteOpen(true)} />
        </div>
      </div>

      {/* Members table */}
      <div className="overflow-hidden rounded-2xl border border-aria-border bg-aria-surface/70 backdrop-blur-md">
        <div className="grid grid-cols-[2.2fr_1.3fr_1.3fr_1fr_1.2fr_44px] items-center gap-3 border-b border-aria-border bg-[#16161f] px-[18px] py-3 max-md:hidden">
          {["Member", "Access", "Status", "Last active", "Usage", ""].map(
            (h, i) => (
              <span
                key={i}
                className="text-[11px] font-semibold tracking-[0.05em] text-aria-text-secondary uppercase"
              >
                {h}
              </span>
            )
          )}
        </div>
        {TEAM_MEMBERS.map((m) => {
          const status = STATUS_MAP[m.status];
          const ratio = m.limit ? m.used / m.limit : 0;
          const pct = Math.round(ratio * 100);
          return (
            <div
              key={m.id}
              className="grid grid-cols-1 items-center gap-3 border-b border-[#16161f] px-[18px] py-3.5 transition-colors hover:bg-white/[0.018] md:grid-cols-[2.2fr_1.3fr_1.3fr_1fr_1.2fr_44px]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex size-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                  style={{ background: m.avatar }}
                >
                  {m.initials}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-aria-text">
                    {m.name}
                  </span>
                  <span className="truncate text-xs text-aria-text-secondary">
                    {m.email}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-aria-text">
                  {m.agents} {m.agents === 1 ? "agent" : "agents"}
                </span>
                <span className="text-[11px] text-aria-text-muted">
                  {m.dashboards}{" "}
                  {m.dashboards === 1 ? "dashboard" : "dashboards"}
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
              <span className="font-mono text-xs text-aria-text-secondary">
                {m.lastActive}
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] text-aria-text-secondary">
                  {m.used}/{m.limit}
                </span>
                <span className="h-[5px] overflow-hidden rounded-full bg-aria-subtle">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${pct}%`, background: usageColor(ratio) }}
                  />
                </span>
              </div>
              <button
                onClick={() => setEditMember(m)}
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
        <EditPanel member={editMember} onClose={() => setEditMember(null)} />
      )}
    </div>
  );
}

function AgentChips({
  selected,
  onToggle,
}: {
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {AGENTS.slice(0, 3).map((agent) => {
        const on = !!selected[agent.id];
        return (
          <button
            key={agent.id}
            onClick={() => onToggle(agent.id)}
            className={cn(
              "flex h-[38px] items-center gap-2 rounded-full border py-0 pr-3 pl-1.5 text-[13px] font-semibold transition-all",
              on
                ? "border-aria-primary/45 bg-aria-primary/15 text-aria-text"
                : "border-aria-border bg-[#16161f] text-aria-text-secondary"
            )}
          >
            <span
              className="size-6 rounded-full"
              style={{
                background: agentGradient(agent.color),
                boxShadow: `0 0 10px ${agent.color}80`,
              }}
            />
            {agent.name}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  on,
  onClick,
}: {
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-6 w-[42px] items-center rounded-full p-0.5 transition-all",
        on ? "aria-gradient justify-end" : "justify-start bg-aria-border"
      )}
    >
      <span className="block size-5 rounded-full bg-white shadow" />
    </button>
  );
}

function PermissionRows({
  selected,
  onToggle,
}: {
  selected: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  return (
    <>
      {PERMISSIONS.map((p) => (
        <div
          key={p.key}
          className="flex items-center gap-3 rounded-[11px] border border-aria-border-subtle bg-[#16161f] px-3 py-2.5"
        >
          <span className="flex-1 text-[13px] text-aria-text">{p.label}</span>
          <Toggle on={!!selected[p.key]} onClick={() => onToggle(p.key)} />
        </div>
      ))}
    </>
  );
}

function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-aria-border px-[22px] pt-5 pb-4">
      <span className="flex-1 font-heading text-lg font-semibold text-aria-text">
        {title}
      </span>
      <button
        onClick={onClose}
        aria-label="Close"
        className="flex size-8 items-center justify-center rounded-[9px] bg-aria-subtle text-aria-text-secondary transition-colors hover:text-aria-text"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [agents, setAgents] = useState<Record<string, boolean>>({ nova: true });
  const [dashboards, setDashboards] = useState<Record<string, boolean>>({
    Work: true,
  });
  const [perms, setPerms] = useState<Record<string, boolean>>({
    dashboards: true,
  });
  const [limit, setLimit] = useState(200);

  return (
    <div
      onClick={onClose}
      className="aria-pop fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-8 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[20px] border border-aria-border bg-aria-elevated/97 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      >
        <ModalHeader title="Invite a team member" onClose={onClose} />
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-[22px] py-[18px]">
          <Field label="Email address">
            <input
              placeholder="name@company.com"
              className="h-[42px] rounded-[11px] border border-aria-border bg-aria-surface px-3.5 text-sm text-aria-text outline-none transition-all focus:border-aria-primary focus:shadow-[0_0_0_3px_rgba(124,58,237,0.14)]"
            />
          </Field>
          <Field label="Which agents can they use?">
            <AgentChips
              selected={agents}
              onToggle={(id) =>
                setAgents((p) => ({ ...p, [id]: !p[id] }))
              }
            />
          </Field>
          <Field label="Which dashboards?">
            <div className="flex flex-wrap gap-2">
              {DASHBOARDS.map((d) => {
                const on = !!dashboards[d.name];
                return (
                  <button
                    key={d.name}
                    onClick={() =>
                      setDashboards((p) => ({ ...p, [d.name]: !p[d.name] }))
                    }
                    className={cn(
                      "inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-all",
                      on
                        ? "border-aria-accent/40 bg-aria-accent/15 text-aria-text"
                        : "border-aria-border bg-[#16161f] text-aria-text-secondary"
                    )}
                  >
                    {d.emoji} {d.name}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Permissions">
            <PermissionRows
              selected={perms}
              onToggle={(k) => setPerms((p) => ({ ...p, [k]: !p[k] }))}
            />
          </Field>
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
            <div className="flex justify-between font-mono text-[11px] text-aria-text-muted">
              <span>0</span>
              <span>500</span>
            </div>
          </Field>
        </div>
        <div className="flex gap-2.5 border-t border-aria-border px-[22px] py-4">
          <button
            onClick={onClose}
            className="h-[42px] rounded-[11px] border border-aria-border px-[18px] text-sm font-semibold text-aria-text-secondary transition-colors hover:text-aria-text"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="aria-gradient h-[42px] flex-1 rounded-[11px] text-sm font-semibold text-white shadow-[0_6px_20px_rgba(124,58,237,0.3)] transition-[filter] hover:brightness-110"
          >
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}

function EditPanel({
  member,
  onClose,
}: {
  member: TeamMember;
  onClose: () => void;
}) {
  const [agents, setAgents] = useState<Record<string, boolean>>({
    nova: true,
    max: true,
  });
  const [perms, setPerms] = useState<Record<string, boolean>>({
    integrations: true,
    dashboards: true,
  });
  const ratio = member.limit ? member.used / member.limit : 0;
  const pct = Math.round(ratio * 100);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex justify-end bg-black/60 backdrop-blur-[4px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="aria-slide-left flex h-full w-[380px] max-w-full flex-col border-l border-aria-border bg-aria-elevated/98 shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center gap-3 border-b border-aria-border px-5 pt-[22px] pb-[18px]">
          <span
            className="flex size-[46px] shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white"
            style={{ background: member.avatar }}
          >
            {member.initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-heading text-base font-semibold text-aria-text">
              {member.name}
            </div>
            <div className="truncate text-xs text-aria-text-secondary">
              {member.email}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-[9px] bg-aria-subtle text-aria-text-secondary transition-colors hover:text-aria-text"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-[22px] overflow-y-auto p-5">
          <Field label="Agent access" upper>
            <AgentChips
              selected={agents}
              onToggle={(id) => setAgents((p) => ({ ...p, [id]: !p[id] }))}
            />
          </Field>
          <Field label="Permissions" upper>
            <PermissionRows
              selected={perms}
              onToggle={(k) => setPerms((p) => ({ ...p, [k]: !p[k] }))}
            />
          </Field>
          <Field label="Usage this month" upper>
            <div className="flex flex-col gap-2 rounded-[11px] border border-aria-border-subtle bg-[#16161f] p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-aria-text">
                  {member.used}/{member.limit} messages
                </span>
                <span className="font-mono text-xs text-aria-text-secondary">
                  {pct}%
                </span>
              </div>
              <span className="h-1.5 overflow-hidden rounded-full bg-aria-subtle">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${pct}%`, background: usageColor(ratio) }}
                />
              </span>
            </div>
          </Field>
          <div className="flex flex-col gap-2.5 rounded-[13px] border border-aria-danger/30 bg-aria-danger/4 p-3.5">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-aria-danger uppercase">
              Danger zone
            </span>
            <button className="h-[38px] rounded-[10px] border border-aria-warning/40 text-[13px] font-semibold text-aria-warning transition-colors hover:bg-aria-warning/10">
              Suspend access
            </button>
            <button className="h-[38px] rounded-[10px] border border-aria-danger/40 text-[13px] font-semibold text-aria-danger transition-colors hover:bg-aria-danger/10">
              Remove member
            </button>
          </div>
        </div>

        <div className="border-t border-aria-border px-5 py-4">
          <button
            onClick={onClose}
            className="aria-gradient h-[42px] w-full rounded-[11px] text-sm font-semibold text-white transition-[filter] hover:brightness-110"
          >
            Save changes
          </button>
        </div>
      </div>
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

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Phone, Trash2 } from "lucide-react";

import {
  deleteAgent,
  useRemoveAgentFromCache,
} from "@/hooks/use-agents";
import type { Agent } from "@/lib/aria/types";
import { agentGradient } from "@/lib/aria/mock-data";

export function AgentCard({ agent }: { agent: Agent }) {
  const removeAgentFromCache = useRemoveAgentFromCache();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = agent.status === "active";
  const canUseLiveVoice = agent.voiceAllowed && agent.voice.enabled;

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handleDelete = async () => {
    if (agent.isDefault || deleting) return;

    setMenuOpen(false);
    const confirmed = window.confirm(
      `Delete "${agent.name}"? All conversations and memories for this agent will be removed. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteAgent(agent.id);
      removeAgentFromCache(agent.id);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to delete agent"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="group relative flex flex-col items-center gap-1 overflow-hidden rounded-[18px] border border-aria-border bg-aria-surface/70 px-[18px] pt-[22px] pb-4 backdrop-blur-md transition-transform hover:-translate-y-1"
      style={{ borderTopColor: agent.color, borderTopWidth: 2 }}
    >
      {/* Aura */}
      <div
        className="pointer-events-none absolute -top-[30%] left-1/2 size-40 -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${agent.color}88, transparent 65%)`,
        }}
      />

      {/* Status */}
      <span className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-aria-text-secondary">
        <span
          className="size-[7px] rounded-full"
          style={{
            background: isActive ? "#10B981" : "#475569",
            boxShadow: isActive ? "0 0 8px #10B981" : undefined,
          }}
        />
        {isActive ? "Active" : "Inactive"}
      </span>

      {/* Avatar */}
      <span
        className="aria-breathe relative mb-1.5 size-20 rounded-full"
        style={{
          background: agentGradient(agent.color),
          boxShadow: `0 0 28px ${agent.color}88`,
        }}
      />

      <h3 className="mt-1 font-heading text-xl font-bold text-aria-text">
        {agent.name}
      </h3>
      <span
        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
        style={{ color: agent.color, background: `${agent.color}28` }}
      >
        {agent.role}
      </span>

      <p className="mt-3 text-center text-xs text-aria-text-secondary">
        {agent.conversations} conversations · {agent.apps.length} apps
      </p>

      <div className="mt-3 flex items-center gap-1.5">
        {agent.apps.map((app) => (
          <span
            key={app.name}
            title={app.name}
            className="flex size-[26px] items-center justify-center rounded-[7px] font-heading text-[11px] font-bold text-white"
            style={{ background: app.color }}
          >
            {app.glyph}
          </span>
        ))}
        <span className="ml-1 text-[11px] text-aria-text-muted">
          {agent.lastActive}
        </span>
      </div>

      <div className="mt-4 flex w-full items-center gap-2">
        <Link
          href={`/agents/${agent.id}`}
          className="flex h-9 flex-1 items-center justify-center rounded-full border border-aria-border bg-aria-elevated text-[13px] font-semibold text-aria-text-secondary transition-colors hover:text-aria-text"
        >
          Chat
        </Link>
        {canUseLiveVoice ? (
          <Link
            href={`/agents/${agent.id}?voice=1`}
            className="aria-gradient flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold text-white transition-[filter] hover:brightness-110"
          >
            <Phone className="size-3.5" />
            Talk live
          </Link>
        ) : (
          <span
            className="flex h-9 flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-full bg-aria-subtle text-[13px] font-semibold text-aria-text-muted opacity-60"
            title={
              agent.voiceAllowed
                ? "Enable voice on this agent to use live conversation"
                : "Upgrade to Starter for live voice"
            }
          >
            <Phone className="size-3.5" />
            Talk live
          </span>
        )}
        <Link
          href={`/agents/${agent.id}/settings`}
          className="h-9 rounded-full border border-aria-border bg-aria-elevated px-3.5 text-[13px] font-medium text-aria-text-secondary transition-colors hover:border-aria-border hover:text-aria-text"
        >
          Settings
        </Link>
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            aria-label="More"
            aria-expanded={menuOpen}
            disabled={deleting}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-9 items-center justify-center rounded-full border border-aria-border bg-aria-elevated text-aria-text-secondary transition-colors hover:text-aria-text disabled:opacity-50"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <div className="aria-pop absolute right-0 bottom-[calc(100%+6px)] z-50 min-w-[160px] rounded-[12px] border border-aria-border bg-aria-elevated p-1 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
              {!agent.isDefault ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[13px] font-medium text-aria-danger transition-colors hover:bg-aria-danger/10 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  {deleting ? "Deleting…" : "Delete agent"}
                </button>
              ) : (
                <p className="px-3 py-2 text-[12px] text-aria-text-muted">
                  Default agent cannot be deleted
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

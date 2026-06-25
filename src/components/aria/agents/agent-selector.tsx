"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { AgentOrb } from "@/components/aria/agent-orb";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/aria/types";

interface AgentSelectorProps {
  agents: Agent[];
  value: string | null;
  onChange: (agentId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AgentSelector({
  agents,
  value,
  onChange,
  disabled,
  className,
}: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = agents.find((a) => a.id === value) ?? agents[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!selected) {
    return (
      <span className="text-xs text-aria-text-muted">No agents available</span>
    );
  }

  return (
    <div ref={ref} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        disabled={disabled || agents.length <= 1}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 max-w-full items-center gap-2 rounded-full border border-aria-border bg-aria-surface py-0 pr-2 pl-1.5 transition-colors hover:bg-aria-elevated disabled:opacity-60"
      >
        <AgentOrb color={selected.color} size={24} />
        <span className="truncate text-[13px] font-semibold text-aria-text">
          {selected.name}
        </span>
        {agents.length > 1 && (
          <ChevronDown className="size-3.5 shrink-0 text-aria-text-secondary" />
        )}
      </button>

      {open && agents.length > 1 && (
        <div className="aria-pop absolute top-[calc(100%+6px)] right-0 z-50 w-64 rounded-[14px] border border-aria-border bg-aria-elevated p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          <div className="px-2.5 pt-2 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
            Switch agent
          </div>
          {agents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => {
                onChange(agent.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition-colors hover:bg-aria-subtle",
                agent.id === selected.id && "bg-aria-primary/10"
              )}
            >
              <AgentOrb color={agent.color} size={28} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-semibold text-aria-text">
                  {agent.name}
                </span>
                <span className="truncate text-[11px] text-aria-text-secondary">
                  {agent.role}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

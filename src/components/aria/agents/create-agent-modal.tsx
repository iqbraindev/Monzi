"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AGENT_COLOR_OPTIONS,
  AGENT_ROLE_PRESETS,
} from "@/lib/agents/constants";
import { agentGradient } from "@/lib/aria/mock-data";
import { createAgent } from "@/hooks/use-agents";

interface CreateAgentModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateAgentModal({ onClose, onCreated }: CreateAgentModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(AGENT_ROLE_PRESETS[0].value);
  const [color, setColor] = useState<string>(AGENT_ROLE_PRESETS[0].color);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedRole =
    AGENT_ROLE_PRESETS.find((preset) => preset.value === role) ??
    AGENT_ROLE_PRESETS[0];

  const selectRole = (preset: (typeof AGENT_ROLE_PRESETS)[number]) => {
    setRole(preset.value);
    setColor(preset.color);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a name for your agent.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createAgent({ name: name.trim(), role, color });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setSubmitting(false);
    }
  };

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
            Create a new agent
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

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-[22px] py-[18px]"
        >
          <div className="flex flex-col items-center gap-3 py-2">
            <span
              className="size-20 rounded-full"
              style={{
                background: agentGradient(color),
                boxShadow: `0 0 28px ${color}88`,
              }}
            />
            <p className="text-center text-xs text-aria-text-secondary">
              Give them a name, a look, and a purpose.
            </p>
          </div>

          <Field label="Agent name">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nova, Max, Ivy"
              className="h-[42px] w-full rounded-[11px] border border-aria-border bg-aria-surface px-3.5 text-sm text-aria-text outline-none transition-all focus:border-aria-primary focus:shadow-[0_0_0_3px_rgba(124,58,237,0.14)]"
            />
          </Field>

          <Field label="Role">
            <div className="flex flex-wrap gap-2">
              {AGENT_ROLE_PRESETS.map((preset) => {
                const selected = role === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => selectRole(preset)}
                    className={cn(
                      "inline-flex h-[34px] items-center rounded-full border px-3.5 text-[13px] font-medium transition-all",
                      selected
                        ? "border-aria-primary/40 bg-aria-primary/15 text-aria-text"
                        : "border-aria-border bg-[#16161f] text-aria-text-secondary hover:border-aria-border hover:text-aria-text"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Color">
            <div className="flex flex-wrap gap-2.5">
              {AGENT_COLOR_OPTIONS.map((option) => {
                const selected = color === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setColor(option)}
                    aria-label={`Color ${option}`}
                    className={cn(
                      "size-9 rounded-full transition-transform hover:scale-105",
                      selected &&
                        "ring-2 ring-white ring-offset-2 ring-offset-aria-elevated"
                    )}
                    style={{ background: option }}
                  />
                );
              })}
            </div>
          </Field>

          <div className="rounded-[12px] border border-aria-border bg-aria-surface/60 px-4 py-3 text-center">
            <p className="text-sm font-medium text-aria-text">
              {name.trim() || "Your agent"}
            </p>
            <p className="mt-0.5 text-xs text-aria-text-secondary">
              {selectedRole.label}
            </p>
          </div>

          {error && (
            <p className="text-sm text-aria-danger">{error}</p>
          )}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 flex-1 rounded-full border border-aria-border bg-aria-elevated text-sm font-medium text-aria-text-secondary transition-colors hover:text-aria-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="aria-gradient flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create agent"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

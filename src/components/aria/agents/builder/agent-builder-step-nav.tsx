"use client";

import { cn } from "@/lib/utils";
import type { WizardStep } from "@/lib/agents/form-types";
import { WIZARD_STEPS } from "@/lib/agents/form-types";

const STEP_LABELS: Record<WizardStep, string> = {
  role: "Role",
  identity: "Identity",
  persona: "Persona",
  apps: "Apps",
  voice: "Voice",
  energy: "Energy",
  review: "Review",
};

interface AgentBuilderStepNavProps {
  current: WizardStep;
  onStepClick?: (step: WizardStep) => void;
}

export function AgentBuilderStepNav({
  current,
  onStepClick,
}: AgentBuilderStepNavProps) {
  const currentIdx = WIZARD_STEPS.indexOf(current);

  return (
    <nav className="mb-3 flex shrink-0 items-center gap-0 overflow-x-auto pb-0.5">
      {WIZARD_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = step === current;
        return (
          <div key={step} className="flex items-center">
            <button
              type="button"
              disabled={!onStepClick}
              onClick={() => onStepClick?.(step)}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all",
                done && "bg-aria-primary text-white",
                active &&
                  !done &&
                  "border border-aria-primary bg-aria-primary/15 text-aria-primary-light",
                !done &&
                  !active &&
                  "border border-aria-border text-aria-text-muted"
              )}
            >
              {done ? "✓" : i + 1}
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <span
                className={cn(
                  "mx-1 h-0.5 w-6 shrink-0 rounded-full transition-colors",
                  i < currentIdx ? "bg-aria-primary" : "bg-aria-border"
                )}
              />
            )}
          </div>
        );
      })}
      <span className="ml-3 shrink-0 text-xs font-medium text-aria-text-secondary">
        {STEP_LABELS[current]}
      </span>
    </nav>
  );
}

"use client";

import { cn } from "@/lib/utils";
import type { OnboardingStep } from "@/lib/onboarding/types";

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: "workspace", label: "Workspace" },
  { id: "agent", label: "Agent" },
  { id: "dashboard", label: "Dashboard" },
  { id: "chat", label: "First chat" },
];

interface OnboardingProgressProps {
  current: OnboardingStep;
}

export function OnboardingProgress({ current }: OnboardingProgressProps) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-center gap-2 px-6 py-6">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step.id} className="flex flex-1 items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  done && "bg-aria-primary text-white",
                  active && "border-2 border-aria-primary bg-aria-primary/15 text-aria-primary-light",
                  !done && !active && "border border-aria-border bg-aria-surface text-aria-text-muted"
                )}
              >
                {idx + 1}
              </div>
              <span
                className={cn(
                  "hidden text-[11px] sm:block",
                  active ? "text-aria-text" : "text-aria-text-muted"
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "mb-5 h-px flex-1",
                  idx < currentIdx ? "bg-aria-primary" : "bg-aria-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

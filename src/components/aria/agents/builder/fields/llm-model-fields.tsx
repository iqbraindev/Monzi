"use client";

import { cn } from "@/lib/utils";
import {
  LLM_MODEL_OPTIONS,
  type LlmModelOption,
} from "@/lib/agents/llm-models";
import { BuilderField } from "@/components/aria/agents/builder/agent-builder-shell";

interface LlmModelFieldsProps {
  value: string;
  onChange: (modelId: string) => void;
}

export function LlmModelFields({ value, onChange }: LlmModelFieldsProps) {
  const recommended = LLM_MODEL_OPTIONS.filter((m) => m.tier === "recommended");
  const free = LLM_MODEL_OPTIONS.filter((m) => m.tier === "free");

  return (
    <div className="flex flex-col gap-3">
      <BuilderField
        label="Language model"
        hint="Powers this agent's chat — free models work without OpenRouter credits"
      >
        <ModelGroup
          title="Popular"
          models={recommended}
          selected={value}
          onSelect={onChange}
        />
        <ModelGroup
          title="Free models"
          models={free}
          selected={value}
          onSelect={onChange}
          className="mt-3"
        />
      </BuilderField>
    </div>
  );
}

function ModelGroup({
  title,
  models,
  selected,
  onSelect,
  className,
}: {
  title: string;
  models: LlmModelOption[];
  selected: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-aria-text-muted uppercase">
        {title}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {models.map((model) => {
          const active = selected === model.id;
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onSelect(model.id)}
              className={cn(
                "flex flex-col gap-1 rounded-[11px] border px-3 py-2.5 text-left transition-all",
                active
                  ? "border-aria-primary/40 bg-aria-primary/10"
                  : "border-aria-border bg-aria-surface/60 hover:border-aria-border"
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-aria-text">
                  {model.label}
                </span>
                {model.badge && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                      model.tier === "free"
                        ? "bg-aria-success/15 text-aria-success"
                        : "bg-aria-primary/15 text-aria-primary-light"
                    )}
                  >
                    {model.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] text-aria-text-muted">
                {model.provider}
              </span>
              <span className="text-[11px] leading-snug text-aria-text-secondary">
                {model.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

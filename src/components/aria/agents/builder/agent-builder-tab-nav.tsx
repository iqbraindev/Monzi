"use client";

import { cn } from "@/lib/utils";
import type { StudioTab } from "@/lib/agents/form-types";
import { STUDIO_TABS } from "@/lib/agents/form-types";

interface AgentBuilderTabNavProps {
  current: StudioTab;
  onChange: (tab: StudioTab) => void;
}

export function AgentBuilderTabNav({ current, onChange }: AgentBuilderTabNavProps) {
  return (
    <nav className="mb-5 flex flex-wrap gap-2 border-b border-aria-border pb-4">
      {STUDIO_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "h-9 rounded-full border px-4 text-[13px] font-semibold transition-all",
            current === tab.id
              ? "border-aria-primary/40 bg-aria-primary/15 text-aria-text"
              : "border-aria-border bg-[#16161f] text-aria-text-secondary hover:text-aria-text"
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

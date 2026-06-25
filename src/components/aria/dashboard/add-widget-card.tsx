"use client";

import { Plus } from "lucide-react";

import { useDashboardStore } from "@/lib/store/dashboard-store";
import { cn } from "@/lib/utils";

export function AddWidgetCard({
  onAdd,
  className,
}: {
  onAdd?: () => void;
  className?: string;
}) {
  const setPickerOpen = useDashboardStore((s) => s.setPickerOpen);

  return (
    <button
      onClick={onAdd ?? (() => setPickerOpen(true))}
      className={cn(
        "flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-aria-border text-aria-text-secondary transition-colors hover:border-aria-primary hover:text-aria-primary-light",
        className
      )}
    >
      <Plus className="size-5" />
      <span className="text-sm font-medium">Add Widget</span>
    </button>
  );
}

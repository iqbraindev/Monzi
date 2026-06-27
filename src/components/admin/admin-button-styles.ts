import { cn } from "@/lib/utils";

/** Shared button classes for the dark admin console (shadcn tokens need `.dark` ancestor). */
export const adminButtonOutline =
  "border-amber-500/25 bg-aria-elevated/80 text-aria-text hover:bg-aria-subtle hover:text-aria-text";

export const adminButtonPrimary =
  "border-amber-500/30 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25 hover:text-amber-50";

export function adminShellClassName(className?: string) {
  return cn("dark", className);
}

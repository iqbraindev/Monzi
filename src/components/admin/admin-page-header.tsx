"use client";

import type { LucideIcon } from "lucide-react";

export function AdminPageHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <div className="mb-1 flex items-center gap-2 text-amber-400/90">
          <Icon className="size-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Platform Admin
          </span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-aria-text">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-aria-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}

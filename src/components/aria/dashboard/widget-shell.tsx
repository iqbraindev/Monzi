import { cn } from "@/lib/utils";

interface WidgetShellProps {
  /** Single-letter / short brand mark shown in the colored logo chip. */
  logo: string;
  logoColor: string;
  title: string;
  /** @deprecated Grid layout controls sizing; kept for call-site compatibility. */
  span?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function WidgetShell({
  logo,
  logoColor,
  title,
  badge,
  actions,
  footer,
  children,
  className,
  headerClassName,
}: WidgetShellProps) {
  return (
    <section
      className={cn(
        "aria-glass flex h-full w-full flex-col overflow-hidden rounded-2xl",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b border-aria-border-subtle px-3 py-3.5",
          headerClassName
        )}
      >
        <div className="widget-drag-handle flex min-w-0 flex-1 cursor-grab items-center gap-2.5 active:cursor-grabbing">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-[7px] font-heading text-[11px] font-bold text-white"
            style={{ background: logoColor }}
          >
            {logo}
          </span>
          <span className="truncate font-heading text-[15px] font-semibold text-aria-text">
            {title}
          </span>
          {badge}
        </div>
        {actions && <div className="flex shrink-0 items-center">{actions}</div>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
      {footer && (
        <div className="border-t border-aria-border-subtle">{footer}</div>
      )}
    </section>
  );
}

export function WidgetBadge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "primary" | "success" | "warning";
}) {
  const tones: Record<string, string> = {
    muted: "bg-aria-subtle text-aria-text-secondary",
    primary: "bg-aria-primary/15 text-aria-primary-light",
    success: "bg-aria-success/15 text-aria-success",
    warning: "bg-aria-warning/15 text-aria-warning",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

import { cn } from "@/lib/utils";

interface WidgetShellProps {
  /** Single-letter / short brand mark shown in the colored logo chip. */
  logo: string;
  logoColor: string;
  title: string;
  /** Tailwind column span on the 12-col grid, e.g. "lg:col-span-5". */
  span: string;
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
  span,
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
        "aria-glass col-span-12 flex flex-col overflow-hidden rounded-2xl",
        span,
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-aria-border-subtle px-4 py-3.5",
          headerClassName
        )}
      >
        <span
          className="flex size-6 items-center justify-center rounded-[7px] font-heading text-[11px] font-bold text-white"
          style={{ background: logoColor }}
        >
          {logo}
        </span>
        <span className="font-heading text-[15px] font-semibold text-aria-text">
          {title}
        </span>
        {badge}
        {actions && <div className="ml-auto flex items-center">{actions}</div>}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
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

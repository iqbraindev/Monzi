"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

interface AgentBuilderShellProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  limitBadge?: string;
  headerExtra?: React.ReactNode;
  preview: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AgentBuilderShell({
  title,
  subtitle,
  backHref = "/agents",
  limitBadge,
  headerExtra,
  preview,
  children,
  footer,
  className,
}: AgentBuilderShellProps) {
  return (
    <div
      className={cn(
        "relative mx-auto flex h-[calc(100vh-56px)] w-full max-w-[1100px] flex-col px-5 py-4",
        className
      )}
    >
      <header className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className="flex size-9 items-center justify-center rounded-[9px] border border-aria-border bg-aria-elevated text-aria-text-secondary transition-colors hover:text-aria-text"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-bold tracking-tight text-aria-text">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-xs text-aria-text-secondary">{subtitle}</p>
          )}
        </div>
        {limitBadge && (
          <span className="font-mono text-xs text-aria-text-secondary">
            {limitBadge}
          </span>
        )}
        {headerExtra}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <div className="hidden shrink-0 lg:block lg:sticky lg:top-4 lg:self-start">
          {preview}
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">{children}</div>
          {footer && (
            <div className="mt-2 shrink-0 border-t border-aria-border pt-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface BuilderFooterProps {
  onBack?: () => void;
  onContinue?: () => void;
  backLabel?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
  loading?: boolean;
  skipLabel?: string;
  onSkip?: () => void;
}

export function BuilderFooter({
  onBack,
  onContinue,
  backLabel = "Back",
  continueLabel = "Continue",
  continueDisabled,
  loading,
  skipLabel,
  onSkip,
}: BuilderFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="h-9 rounded-[11px] border border-aria-border bg-transparent px-4 text-sm font-semibold text-aria-text-secondary transition-colors hover:text-aria-text"
          >
            {backLabel}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {onSkip && skipLabel && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-aria-text-secondary transition-colors hover:text-aria-text"
          >
            {skipLabel}
          </button>
        )}
        {onContinue && (
          <button
            type="button"
            disabled={continueDisabled || loading}
            onClick={onContinue}
            className="aria-gradient flex h-9 min-w-[112px] items-center justify-center rounded-[11px] px-5 text-sm font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Saving…" : continueLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function BuilderField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
        {label}
      </span>
      {hint && (
        <p className="-mt-0.5 text-[11px] text-aria-text-secondary">{hint}</p>
      )}
      {children}
    </div>
  );
}

export const builderInputClass =
  "h-[42px] w-full rounded-[11px] border border-aria-border bg-aria-surface px-3.5 text-sm text-aria-text outline-none transition-all focus:border-aria-primary focus:shadow-[0_0_0_3px_rgba(124,58,237,0.14)]";

export const builderTextareaClass =
  "min-h-[100px] w-full resize-y rounded-[11px] border border-aria-border bg-aria-surface px-3.5 py-3 text-sm text-aria-text outline-none transition-all focus:border-aria-primary focus:shadow-[0_0_0_3px_rgba(124,58,237,0.14)]";

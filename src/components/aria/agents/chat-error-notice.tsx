"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

import { formatAiErrorMessage } from "@/lib/ai/user-facing-errors";
import { cn } from "@/lib/utils";

interface ChatErrorNoticeProps {
  error: Error | undefined;
  onRetry?: () => void;
  className?: string;
}

export function ChatErrorNotice({
  error,
  onRetry,
  className,
}: ChatErrorNoticeProps) {
  if (!error) return null;

  const message = formatAiErrorMessage(error);

  return (
    <div
      role="alert"
      className={cn(
        "flex max-w-[82%] flex-col gap-2.5 self-start rounded-[14px] border border-aria-danger/35 bg-aria-danger/10 px-4 py-3",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-aria-danger" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-aria-text">
            Couldn&apos;t get a response
          </p>
          <p className="mt-1 text-sm leading-relaxed text-aria-text-secondary">
            {message}
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-aria-border bg-aria-elevated px-3 py-1.5 text-xs font-medium text-aria-text-secondary transition-colors hover:text-aria-text"
        >
          <RotateCcw className="size-3" />
          Try again
        </button>
      )}
    </div>
  );
}

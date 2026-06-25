import Link from "next/link";

export function WidgetConnectCta({
  toolkit,
  label,
}: {
  toolkit: string;
  label: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm text-aria-text-secondary">{label}</p>
      <Link
        href={`/integrations?app=${toolkit}`}
        className="rounded-full border border-aria-primary/40 bg-aria-primary/15 px-4 py-2 text-xs font-semibold text-aria-primary-light transition-colors hover:bg-aria-primary/25"
      >
        Connect app
      </Link>
    </div>
  );
}

export function WidgetLoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-aria-text-muted">
      Loading…
    </div>
  );
}

export function WidgetErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-sm text-aria-text-secondary">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold text-aria-primary-light hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

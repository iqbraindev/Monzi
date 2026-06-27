"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

import { AppLogo } from "@/components/aria/integrations/integration-logo";
import type { AppGlyph } from "@/lib/aria/types";

export function capabilityForApp(
  appName: string,
  capabilities: string[]
): string {
  const match = capabilities.find((c) =>
    c.toLowerCase().includes(appName.toLowerCase())
  );
  return match ?? `Use ${appName} on your behalf`;
}

export function ConnectedAppIcon({
  app,
  capability,
}: {
  app: AppGlyph;
  capability: string;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  }, []);

  const show = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <span
        ref={anchorRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="flex size-9 cursor-default items-center justify-center rounded-lg transition-opacity hover:opacity-80"
        aria-label={app.name}
        tabIndex={0}
      >
        <AppLogo app={app} size={24} radius={6} bare />
      </span>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            className="fixed z-[200] w-[220px] -translate-y-1/2 rounded-xl border border-aria-border bg-aria-elevated p-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
            style={{ top: position.top, left: position.left }}
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            <div className="flex items-center gap-2.5">
              <AppLogo app={app} size={28} radius={7} bare />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-aria-text">
                  {app.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-aria-success">
                  <span className="size-1.5 rounded-full bg-aria-success" />
                  Connected
                </p>
              </div>
            </div>
            <div className="mt-2.5 border-t border-aria-border-subtle pt-2.5">
              <p className="text-[10px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
                Capability
              </p>
              <p className="mt-1 flex items-start gap-2 text-xs leading-snug text-aria-text-secondary">
                <Check className="mt-0.5 size-3.5 shrink-0 text-aria-success" />
                {capability}
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

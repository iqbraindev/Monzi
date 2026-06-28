import Link from "next/link";
import type { ReactNode } from "react";

import { AuthPromoPanel } from "@/components/auth/auth-promo-panel";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerLink: {
    prompt: string;
    linkLabel: string;
    href: string;
  };
};

export function AuthShell({
  title,
  subtitle,
  children,
  footerLink,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen bg-aria-base text-aria-text">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_-10%,rgba(124,58,237,0.18),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_90%_100%,rgba(6,182,212,0.08),transparent)]"
        aria-hidden
      />

      <div className="relative flex min-h-screen flex-col lg:flex-row">
        <section className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-[420px]">
            <Link
              href="/"
              className="mb-8 inline-block font-heading text-lg font-bold tracking-tight text-aria-text transition-colors hover:text-aria-primary-light"
            >
              Monzi
            </Link>

            <h1 className="font-heading text-3xl font-bold tracking-tight text-aria-text sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-aria-text-secondary">
              {subtitle}
            </p>

            <div
              className="auth-card mt-8 rounded-2xl border border-aria-border bg-aria-surface/80 p-6 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-7"
            >
              {children}
            </div>

            <p className="mt-5 text-center text-sm text-aria-text-muted">
              {footerLink.prompt}{" "}
              <Link
                href={footerLink.href}
                className="font-medium text-aria-primary-light underline-offset-4 hover:underline"
              >
                {footerLink.linkLabel}
              </Link>
            </p>
          </div>
        </section>

        <aside
          className="relative hidden min-h-screen flex-1 flex-col overflow-hidden border-l border-aria-border/60 bg-aria-surface/40 lg:flex"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-linear-to-br from-[#1a1033]/90 via-aria-surface/95 to-aria-base"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-20 top-20 size-64 rounded-full bg-aria-primary/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-10 bottom-32 size-48 rounded-full bg-aria-accent/15 blur-3xl"
            aria-hidden
          />

          <AuthPromoPanel />
        </aside>
      </div>
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  children: ReactNode;
  panel: {
    heading: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
  };
};

export function AuthShell({ title, children, panel }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <section className="flex flex-1 flex-col justify-center bg-[#eef1f6] px-8 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <h1 className="mb-8 text-center font-[family-name:var(--font-sora)] text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            {title}
          </h1>

          <div className="auth-clerk">{children}</div>

          <p className="mt-6 text-center text-sm text-[#9ca3af] lg:hidden">
            {panel.description}{" "}
            <Link
              href={panel.ctaHref}
              className="font-medium text-[#1a4d3e] underline-offset-4 hover:underline"
            >
              {panel.ctaLabel}
            </Link>
          </p>
        </div>
      </section>

      <aside className="relative hidden min-h-[320px] flex-1 overflow-hidden lg:flex lg:min-h-screen">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80')",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-linear-to-br from-[#1a0a0a]/80 via-[#2d1218]/75 to-[#0f1a2e]/85 backdrop-blur-[2px]"
          aria-hidden
        />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 text-center text-white">
          <h2 className="font-[family-name:var(--font-sora)] text-4xl font-bold tracking-tight sm:text-5xl">
            {panel.heading}
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/85">
            {panel.description}
          </p>
          <Link
            href={panel.ctaHref}
            className="mt-10 inline-flex h-12 min-w-[180px] items-center justify-center rounded-full border-2 border-white px-8 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-white/10"
          >
            {panel.ctaLabel}
          </Link>
        </div>
      </aside>
    </div>
  );
}

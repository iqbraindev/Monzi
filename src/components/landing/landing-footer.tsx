"use client";

import Link from "next/link";

import { SmoothScrollLink } from "@/components/landing/smooth-scroll-link";
import { LANDING_NAV_LINKS } from "@/lib/marketing/landing-nav";

export function LandingFooter() {
  return (
    <footer className="border-t border-aria-border/60 bg-aria-surface/50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="font-heading text-lg font-bold text-aria-text">Monzi</p>
          <p className="mt-1 text-sm text-aria-text-muted">
            AI multi-agent personal & business assistant
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-aria-text-secondary">
          {LANDING_NAV_LINKS.map((link) => (
            <SmoothScrollLink
              key={link.href}
              href={link.href}
              className="hover:text-aria-text"
            >
              {link.label}
            </SmoothScrollLink>
          ))}
          <Link href="/sign-in" className="hover:text-aria-text">
            Sign In
          </Link>
          <Link href="/sign-up" className="hover:text-aria-text">
            Sign Up
          </Link>
        </nav>
      </div>

      <p className="mx-auto mt-8 max-w-6xl text-center text-xs text-aria-text-muted sm:text-left">
        © {new Date().getFullYear()} Monzi. All rights reserved.
      </p>
    </footer>
  );
}

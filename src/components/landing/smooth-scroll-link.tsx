"use client";

import { motion } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";

import { smoothScrollToHash } from "@/lib/marketing/smooth-scroll";
import { cn } from "@/lib/utils";

type SmoothScrollLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
  onScrollStart?: (sectionId: string) => void;
};

export function SmoothScrollLink({
  href,
  children,
  className,
  onNavigate,
  onScrollStart,
}: SmoothScrollLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith("#")) return;

    event.preventDefault();
    const sectionId = href.slice(1);
    if (!sectionId) return;

    onScrollStart?.(sectionId);
    onNavigate?.();

    const scrolled = smoothScrollToHash(href, {
      onComplete: () => {
        window.history.replaceState(null, "", href);
      },
    });

    if (!scrolled) return;
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

type LandingNavLinkProps = {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  onScrollStart?: (sectionId: string) => void;
};

export function LandingNavLink({
  href,
  label,
  active,
  onNavigate,
  onScrollStart,
}: LandingNavLinkProps) {
  return (
    <SmoothScrollLink
      href={href}
      onNavigate={onNavigate}
      onScrollStart={onScrollStart}
      className={cn(
        "relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "text-aria-text" : "text-aria-text-secondary hover:text-aria-text"
      )}
    >
      {active ? (
        <motion.span
          layoutId="landing-nav-active-pill"
          className="absolute inset-0 rounded-full bg-aria-primary/15 ring-1 ring-aria-primary/20"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          aria-hidden
        />
      ) : null}
      <motion.span
        className="relative z-10 block"
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
      >
        {label}
      </motion.span>
      {active ? (
        <motion.span
          layoutId="landing-nav-active-line"
          className="absolute inset-x-3 -bottom-px z-10 h-px bg-linear-to-r from-aria-primary-light to-aria-accent-light"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          aria-hidden
        />
      ) : null}
    </SmoothScrollLink>
  );
}

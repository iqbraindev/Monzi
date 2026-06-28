"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

import { LandingNavLink } from "@/components/landing/smooth-scroll-link";
import { Button } from "@/components/ui/button";
import {
  LANDING_NAV_LINKS,
  LANDING_SECTION_IDS,
} from "@/lib/marketing/landing-nav";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(
    LANDING_SECTION_IDS[0]
  );
  const isProgrammaticScrollRef = useRef(false);
  const scrollUnlockTimerRef = useRef<number | null>(null);

  const handleScrollStart = (sectionId: string) => {
    isProgrammaticScrollRef.current = true;
    setActiveSection(sectionId);

    if (scrollUnlockTimerRef.current !== null) {
      window.clearTimeout(scrollUnlockTimerRef.current);
    }

    scrollUnlockTimerRef.current = window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      scrollUnlockTimerRef.current = null;
    }, 1200);
  };

  useEffect(() => {
    const sections = LANDING_SECTION_IDS.map((id) =>
      document.getElementById(id)
    ).filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-35% 0px -50% 0px",
        threshold: [0, 0.15, 0.35, 0.55],
      }
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => {
      observer.disconnect();
      if (scrollUnlockTimerRef.current !== null) {
        window.clearTimeout(scrollUnlockTimerRef.current);
      }
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-aria-border/60 bg-aria-base/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-heading text-lg font-bold tracking-tight text-aria-text"
        >
          Monzi
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LANDING_NAV_LINKS.map((link) => (
            <LandingNavLink
              key={link.href}
              href={link.href}
              label={link.label}
              active={activeSection === link.href.slice(1)}
              onScrollStart={handleScrollStart}
            />
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/sign-in">
            <Button
              variant="ghost"
              className="text-aria-text-secondary hover:text-aria-text"
            >
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button className="rounded-full bg-aria-primary px-5 font-semibold hover:bg-aria-primary/90">
              Get Started Free
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg text-aria-text-secondary md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={cn(
          "border-t border-aria-border/60 bg-aria-surface md:hidden",
          mobileOpen ? "block" : "hidden"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {LANDING_NAV_LINKS.map((link) => (
            <LandingNavLink
              key={link.href}
              href={link.href}
              label={link.label}
              active={activeSection === link.href.slice(1)}
              onScrollStart={handleScrollStart}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-aria-border/60 pt-4">
            <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up" onClick={() => setMobileOpen(false)}>
              <Button className="w-full rounded-full bg-aria-primary font-semibold hover:bg-aria-primary/90">
                Get Started Free
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

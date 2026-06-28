import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div
          className="relative overflow-hidden rounded-3xl border border-aria-primary/30 bg-linear-to-br from-[#1a1033] via-aria-surface to-[#0f1a2e] px-6 py-14 text-center sm:px-12 sm:py-16"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,rgba(124,58,237,0.35),transparent)]"
            aria-hidden
          />

          <div className="relative">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to meet your AI team?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/75">
              Join Monzi and build agents that know your apps, your data, and
              your workflow. Free to start — no credit card required.
            </p>
            <Link href="/sign-up" className="mt-8 inline-block">
              <Button
                size="lg"
                className="h-11 rounded-full bg-white px-8 font-semibold text-aria-base hover:bg-white/90"
              >
                Get Started Free
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

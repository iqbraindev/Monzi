import type { Pack } from "@/lib/billing/types";

import { LandingPlanCard } from "@/components/landing/landing-plan-card";

interface PricingSectionProps {
  packs: Pack[];
}

export function PricingSection({ packs }: PricingSectionProps) {
  const sorted = [...packs].sort((a, b) => a.sort_order - b.sort_order);
  const popularSlug = "pro";

  return (
    <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28 scroll-mt-16">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-aria-text sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-aria-text-secondary">
            Start free and scale as you grow. Every plan includes core agents,
            dashboards, and integrations — upgrade when you need more.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((pack) => (
            <LandingPlanCard
              key={pack.id}
              pack={pack}
              isPopular={pack.slug === popularSlug}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

import type { Pack } from "@/lib/billing/types";

import { CtaBand } from "@/components/landing/cta-band";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { PricingSection } from "@/components/landing/pricing-section";
import { SocialProof } from "@/components/landing/social-proof";

interface LandingPageProps {
  packs: Pack[];
}

export function LandingPage({ packs }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-aria-base text-aria-text">
      <LandingHeader />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <PricingSection packs={packs} />
        <CtaBand />
      </main>
      <LandingFooter />
    </div>
  );
}

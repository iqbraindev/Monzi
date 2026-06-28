"use client";

import { AppLogo } from "@/components/aria/integrations/integration-logo";
import {
  INTEGRATIONS_CAROUSEL_DURATION_S,
  MARKETING_INTEGRATION_SLUGS,
} from "@/lib/marketing/integrations";
import { integrationFromToolkitSlug } from "@/lib/composio/toolkits";

const CAROUSEL_APPS = MARKETING_INTEGRATION_SLUGS.map((slug) =>
  integrationFromToolkitSlug(slug)
).filter((app): app is NonNullable<typeof app> => app !== null);

function LogoTrack() {
  return (
    <>
      {CAROUSEL_APPS.map((app) => (
        <div
          key={app.toolkitSlug}
          className="flex shrink-0 items-center gap-4 px-10"
        >
          <AppLogo
            app={{
              glyph: app.glyph,
              color: app.bg,
              fg: app.fg,
              name: app.name,
              toolkitSlug: app.toolkitSlug,
            }}
            size={48}
            radius={10}
            bare
          />
          <span className="whitespace-nowrap font-heading text-base font-semibold text-aria-text sm:text-lg">
            {app.name}
          </span>
        </div>
      ))}
      <div className="flex shrink-0 items-center px-10">
        <span className="whitespace-nowrap font-heading text-base font-medium text-aria-text-secondary sm:text-lg">
          + dozens more
        </span>
      </div>
    </>
  );
}

export function IntegrationsCarousel() {
  return (
    <div
      className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] motion-reduce:overflow-visible motion-reduce:[mask-image:none]"
      aria-label="Supported integrations"
    >
      <div
        className="flex w-max animate-aria-marquee hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:max-w-4xl motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-x-8 motion-reduce:gap-y-3 motion-reduce:mx-auto"
        style={{ animationDuration: `${INTEGRATIONS_CAROUSEL_DURATION_S}s` }}
      >
        <div className="flex items-center motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-x-8 motion-reduce:gap-y-3">
          <LogoTrack />
        </div>
        <div className="flex items-center motion-reduce:hidden" aria-hidden>
          <LogoTrack />
        </div>
      </div>
    </div>
  );
}

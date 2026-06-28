import { Sparkles } from "lucide-react";

import { AuthAgentTeamHero } from "@/components/auth/auth-agent-team-hero";

export function AuthPromoPanel() {
  return (
    <div className="relative z-10 flex flex-1 flex-col justify-center px-10 py-12 xl:px-14">
      <div className="max-w-md">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-aria-primary/30 bg-aria-primary/10 px-3 py-1 text-xs font-medium text-aria-primary-light">
          <Sparkles className="size-3.5" />
          AI multi-agent platform
        </span>

        <h2 className="mt-6 font-heading text-3xl font-bold leading-tight tracking-tight text-aria-text xl:text-4xl">
          Your entire digital life, run by{" "}
          <span className="text-aria-primary-light">AI agents</span> you control
        </h2>

      </div>

      <AuthAgentTeamHero />
    </div>
  );
}

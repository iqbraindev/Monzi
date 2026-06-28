"use client";

import { motion } from "framer-motion";
import { Plug } from "lucide-react";

import { IntegrationsCarousel } from "@/components/marketing/integrations-carousel";

export function SocialProof() {
  return (
    <section
      id="integrations"
      className="relative overflow-hidden border-y border-aria-border/60 bg-aria-surface/50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24 scroll-mt-16"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(124,58,237,0.12),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-aria-primary/30 bg-aria-primary/10 px-3 py-1 text-xs font-medium text-aria-primary-light">
            <Plug className="size-3.5" />
            Integrations
          </div>

          <h2 className="font-heading text-3xl font-bold leading-[1.15] tracking-tight text-aria-text sm:text-4xl">
            Connect the apps you{" "}
            <span className="bg-linear-to-r from-aria-primary-light to-aria-accent-light bg-clip-text text-transparent">
              already use
            </span>
          </h2>

          <p className="mt-4 text-base leading-relaxed text-aria-text-secondary sm:text-lg">
            Gmail, Slack, HubSpot, Notion, and dozens more — linked via OAuth so
            your agents work with live data across your whole stack.
          </p>

          <p className="mt-3 text-xs text-aria-text-muted">
            16+ integrations · One-click OAuth · No API keys
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-12 sm:mt-14"
        >
          <IntegrationsCarousel />
        </motion.div>
      </div>
    </section>
  );
}

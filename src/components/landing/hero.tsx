"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import { AgentTeamCarousel } from "@/components/marketing/agent-team-carousel";
import { SmoothScrollLink } from "@/components/landing/smooth-scroll-link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-20">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(124,58,237,0.25),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-aria-primary/30 bg-aria-primary/10 px-3 py-1 text-xs font-medium text-aria-primary-light">
            <Sparkles className="size-3.5" />
            AI multi-agent platform
          </div>

          <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight text-aria-text sm:text-5xl lg:text-[3.25rem]">
            Your entire digital life,{" "}
            <span className="bg-linear-to-r from-aria-primary-light to-aria-accent-light bg-clip-text text-transparent">
              run by AI agents
            </span>{" "}
            you control
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-aria-text-secondary sm:text-lg">
            Create specialized agents with avatars, connect Gmail, CRM, tasks,
            and more — then see everything on one 360° dashboard, built and
            updated by conversation.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="h-11 w-full rounded-full bg-aria-primary px-6 text-sm font-semibold hover:bg-aria-primary/90 sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <SmoothScrollLink href="#how-it-works" className="block sm:inline-block">
              <Button
                variant="outline"
                size="lg"
                className="h-11 w-full rounded-full border-aria-border bg-transparent text-aria-text-secondary sm:w-auto"
              >
                See how it works
              </Button>
            </SmoothScrollLink>
          </div>

          <p className="mt-4 text-xs text-aria-text-muted">
            Free plan · No credit card · Setup in under 2 minutes
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="lg:pl-4"
        >
          <AgentTeamCarousel variant="hero" />
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Bot, LayoutGrid, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = {
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const STEPS: Step[] = [
  {
    step: "1",
    icon: UserPlus,
    title: "Create your account",
    description:
      "Sign up free and set up your workspace in seconds — no technical setup or config files.",
  },
  {
    step: "2",
    icon: Bot,
    title: "Build your first agent",
    description:
      "Pick a name, avatar, and role. Your agent becomes the brain behind your dashboard and workflows.",
  },
  {
    step: "3",
    icon: LayoutGrid,
    title: "Connect apps & chat",
    description:
      "Link Gmail, CRM, tasks, and more. Your dashboard assembles itself — then control everything by chat.",
  },
];

function StepContent({ item }: { item: Step }) {
  return (
    <div className="max-w-[17rem] text-center sm:max-w-xs">
      <h3 className="font-heading text-lg font-semibold text-aria-text sm:text-xl">
        {item.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-aria-text-secondary sm:text-[0.9375rem]">
        {item.description}
      </p>
    </div>
  );
}

function StepNode({ item }: { item: Step }) {
  const Icon = item.icon;

  return (
    <div className="relative z-10 flex size-[4.75rem] shrink-0 flex-col items-center justify-center rounded-full border-2 border-aria-primary/45 bg-aria-base shadow-[0_0_0_6px_rgba(10,10,15,0.9),0_0_32px_rgba(124,58,237,0.18)] sm:size-[5.25rem]">
      <span className="font-heading text-[1.75rem] font-bold leading-none text-transparent [-webkit-text-stroke:1.5px_#a78bfa] sm:text-[2rem]">
        {item.step}
      </span>
      <Icon
        className="mt-1 size-3.5 text-aria-primary-light/80 sm:size-4"
        aria-hidden
      />
    </div>
  );
}

function StepConnector({ direction }: { direction: "up" | "down" }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center py-2",
        direction === "up" && "flex-col-reverse"
      )}
      aria-hidden
    >
      <div className="size-1.5 rounded-full bg-aria-primary/60" />
      <div className="h-8 w-px bg-linear-to-b from-aria-primary/50 to-aria-accent/30 sm:h-10" />
    </div>
  );
}

function TimelinePath() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full"
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="how-it-works-path"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.9" />
        </linearGradient>
        <filter
          id="how-it-works-glow"
          x="-20%"
          y="-80%"
          width="140%"
          height="260%"
        >
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M 30 44 C 90 40, 130 36, 167 40 C 300 46, 400 58, 500 58 C 600 58, 700 36, 833 40 C 900 42, 970 44, 970 44"
        fill="none"
        stroke="url(#how-it-works-path)"
        strokeWidth="1.5"
        strokeLinecap="round"
        filter="url(#how-it-works-glow)"
      />
    </svg>
  );
}

/** Node anchor on the wavy path — step 2 sits in the center valley. */
const DESKTOP_NODE_LAYOUT = [
  { left: "16.666%", top: "40%" },
  { left: "50%", top: "58%" },
  { left: "83.333%", top: "40%" },
] as const;

function DesktopTimeline() {
  return (
    <div className="relative mx-auto mt-16 hidden h-[26rem] max-w-5xl md:block lg:mt-20 lg:h-[28rem]">
      <TimelinePath />

      {STEPS.map((item, i) => {
        const { left, top } = DESKTOP_NODE_LAYOUT[i];
        const contentBelow = i === 1;
        const topPercent = Number.parseFloat(top);

        return (
          <div key={item.step}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left, top }}
            >
              <StepNode item={item} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: contentBelow ? 12 : -12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.1 + 0.05 }}
              className="absolute flex w-full max-w-[17rem] -translate-x-1/2 flex-col items-center sm:max-w-xs"
              style={
                contentBelow
                  ? { left, top: `calc(${top} + 2.75rem)` }
                  : { left, bottom: `calc(${100 - topPercent}% + 2.75rem)` }
              }
            >
              {contentBelow ? (
                <>
                  <StepConnector direction="down" />
                  <StepContent item={item} />
                </>
              ) : (
                <>
                  <StepContent item={item} />
                  <StepConnector direction="down" />
                </>
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

function MobileTimeline() {
  return (
    <div className="relative mx-auto mt-12 max-w-md md:hidden">
      <div
        className="pointer-events-none absolute bottom-8 left-[2.375rem] top-8 w-px bg-linear-to-b from-aria-primary/50 via-aria-accent/40 to-aria-primary-light/50"
        aria-hidden
      />

      <div className="space-y-10">
        {STEPS.map((item, i) => (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="flex gap-5"
          >
            <StepNode item={item} />
            <div className="pt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-aria-primary-light">
                Step {item.step}
              </p>
              <h3 className="mt-1 font-heading text-lg font-semibold text-aria-text">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-aria-text-secondary">
                {item.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden border-y border-aria-border/60 bg-aria-surface/30 px-4 py-20 sm:px-6 lg:px-8 lg:py-28 scroll-mt-16"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(124,58,237,0.08),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-aria-text sm:text-4xl">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-base text-aria-text-secondary sm:text-lg">
            Three simple steps — same flow as day one, so you&apos;re productive
            before your coffee gets cold.
          </p>
        </div>

        <DesktopTimeline />
        <MobileTimeline />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-12 text-center md:mt-14"
        >
          <Link href="/sign-up">
            <Button
              size="lg"
              className="rounded-full bg-aria-primary px-6 font-semibold hover:bg-aria-primary/90"
            >
              Create your first agent
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

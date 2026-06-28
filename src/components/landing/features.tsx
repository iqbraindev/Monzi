"use client";

import { motion } from "framer-motion";
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Users,
  Wand2,
} from "lucide-react";

const FEATURES = [
  {
    icon: Bot,
    title: "A team of agents, not one bot",
    description:
      "Create agents with names, avatars, personalities, and specialized roles — each tuned for a different part of your work.",
    color: "#7c3aed",
  },
  {
    icon: LayoutDashboard,
    title: "360° dashboard",
    description:
      "See email, tasks, pipeline, and calendar in one live view. Widgets update as your connected apps change.",
    color: "#06b6d4",
  },
  {
    icon: Wand2,
    title: "AI-built widgets",
    description:
      "Ask your agent to add or rearrange dashboard widgets on demand — no drag-and-drop config required.",
    color: "#f43f5e",
  },
  {
    icon: Plug,
    title: "Connect your stack",
    description:
      "OAuth integrations with Gmail, Slack, CRMs, and more. Your agents work with real data, not copy-paste.",
    color: "#10b981",
  },
  {
    icon: MessageSquare,
    title: "Chat-first control",
    description:
      "Run your day from conversation — assign tasks, pull reports, and trigger actions across apps in natural language.",
    color: "#6366f1",
  },
  {
    icon: Users,
    title: "Personal & business",
    description:
      "Works for solo founders, freelancers, and small teams with workspaces, seats, and role-based access.",
    color: "#f59e0b",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28 scroll-mt-16"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-aria-text sm:text-4xl">
            One platform for your whole digital world
          </h2>
          <p className="mt-4 text-base text-aria-text-secondary">
            Monzi combines multi-agent AI, app integrations, and a living
            dashboard — so you stop switching tabs and start getting work done.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl border border-aria-border bg-aria-surface/60 p-6 transition-colors hover:border-aria-border-subtle hover:bg-aria-elevated/40"
            >
              <div
                className="mb-4 flex size-10 items-center justify-center rounded-xl"
                style={{
                  background: `${feature.color}18`,
                  color: feature.color,
                }}
              >
                <feature.icon className="size-5" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-aria-text">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-aria-text-secondary">
                {feature.description}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

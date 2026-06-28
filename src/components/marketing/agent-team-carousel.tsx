"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { AgentAvatar } from "@/components/aria/agent-avatar";
import { getAgentAvatarImage } from "@/lib/agents/avatars";
import {
  AGENT_CAROUSEL_AUTO_INTERVAL_MS,
  AGENT_CAROUSEL_SLOT_BY_OFFSET,
  getAgentCarouselHeight,
  getAgentCarouselOffset,
  MARKETING_AGENT_TEAM,
} from "@/lib/marketing/agent-team";
import { cn } from "@/lib/utils";

function getAvatarWidth(height: number, assetId: string): number {
  const image = getAgentAvatarImage(assetId);
  if (!image) return height;
  return Math.round(height * (image.width / image.height));
}

type AgentTeamCarouselProps = {
  /** `panel` — auth aside card; `hero` — landing hero with outer glow */
  variant?: "panel" | "hero";
};

export function AgentTeamCarousel({ variant = "panel" }: AgentTeamCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((index: number) => {
    setActive(index);
    setPaused(true);
    window.setTimeout(() => setPaused(false), AGENT_CAROUSEL_AUTO_INTERVAL_MS * 2);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % MARKETING_AGENT_TEAM.length);
    }, AGENT_CAROUSEL_AUTO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  const activeAgent = MARKETING_AGENT_TEAM[active];
  const isHero = variant === "hero";

  const content = (
    <>


      <div
        className={cn(
          "relative mt-6",
          isHero ? "min-h-[300px] sm:min-h-[360px]" : "min-h-[260px] sm:min-h-[300px]"
        )}
        style={{
          perspective: "1100px",
          perspectiveOrigin: "center bottom",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-2 bottom-0 h-32 rounded-full bg-aria-primary/35 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-linear-to-r from-transparent via-aria-primary/25 to-transparent"
          aria-hidden
        />

        <div
          className={cn(
            "relative",
            isHero ? "min-h-[300px] sm:min-h-[360px]" : "min-h-[260px] sm:min-h-[300px]"
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          {MARKETING_AGENT_TEAM.map((agent, index) => {
            const offset = getAgentCarouselOffset(
              index,
              active,
              MARKETING_AGENT_TEAM.length
            );
            const slot = AGENT_CAROUSEL_SLOT_BY_OFFSET[offset];
            const baseHeight = getAgentCarouselHeight(offset);
            const height = isHero ? Math.round(baseHeight * 1.18) : baseHeight;
            const width = getAvatarWidth(height, agent.assetId);
            const spread = isHero ? 96 : 88;
            const isActive = offset === 0;

            return (
              <motion.div
                key={agent.assetId}
                className={cn(
                  "absolute bottom-0 left-1/2",
                  !isActive && "cursor-pointer"
                )}
                style={{
                  zIndex: slot.zIndex,
                  transformOrigin: "bottom center",
                  width,
                  height,
                }}
                initial={false}
                animate={{
                  x: offset * spread - width / 2,
                  rotateY: slot.rotateY,
                  z: slot.z,
                  scale: slot.scale,
                  opacity: Math.abs(offset) === 2 ? 0.72 : 1,
                }}
                transition={{ type: "spring", stiffness: 280, damping: 30 }}
                onClick={() => {
                  if (!isActive) goTo(index);
                }}
                aria-hidden={!isActive}
              >
                <AgentAvatar
                  assetId={agent.assetId}
                  color={agent.color}
                  size={height}
                  variant="full"
                  neon
                  breathe={isActive}
                  alt={agent.label}
                  className="drop-shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {MARKETING_AGENT_TEAM.map((agent, index) => (
          <button
            key={agent.assetId}
            type="button"
            aria-label={`Show ${agent.label}`}
            aria-current={index === active ? "true" : undefined}
            onClick={() => goTo(index)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              index === active
                ? "w-6 bg-aria-primary-light"
                : "w-1.5 bg-aria-border hover:bg-aria-text-muted"
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeAgent.assetId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="mt-5 text-center"
        >
          <h3
            className={cn(
              "font-heading font-bold text-aria-text",
              isHero ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
            )}
          >
            {activeAgent.label}
          </h3>
          <p
            className="mt-1 text-sm font-medium"
            style={{ color: activeAgent.color }}
          >
            {activeAgent.role}
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-aria-text-secondary sm:text-base">
            {activeAgent.description}
          </p>
        </motion.div>
      </AnimatePresence>
    </>
  );

  if (isHero) {
    return (
      <div className="relative mx-auto w-full max-w-2xl">
        <div
          className="pointer-events-none absolute -right-6 top-8 size-40 rounded-full bg-aria-primary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-4 bottom-16 size-32 rounded-full bg-aria-accent/15 blur-3xl"
          aria-hidden
        />
        {content}
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-aria-border/80 bg-aria-base/60 p-6 backdrop-blur-sm sm:p-8">
      {content}
    </div>
  );
}

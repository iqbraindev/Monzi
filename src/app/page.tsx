import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/landing-page";
import { getClerkUserRole } from "@/lib/auth/super-admin";
import { getPublicPacks } from "@/lib/billing/subscription";
import { LANDING_FALLBACK_PACKS } from "@/lib/landing/fallback-packs";

export const metadata: Metadata = {
  title: "Monzi — Your AI agent team for work and life",
  description:
    "Create AI agents with avatars, connect your apps, and control everything from one 360° dashboard. Free to start — no credit card required.",
  openGraph: {
    title: "Monzi — Your AI agent team for work and life",
    description:
      "Multi-agent AI platform with integrations, live dashboards, and chat-first control.",
    type: "website",
  },
};

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) {
    const role = await getClerkUserRole(userId);
    redirect(role === "super_admin" ? "/admin" : "/dashboard");
  }

  let packs = LANDING_FALLBACK_PACKS;
  try {
    const livePacks = await getPublicPacks();
    if (livePacks.length > 0) packs = livePacks;
  } catch {
    // Use static fallback when DB is unavailable (local dev)
  }

  return <LandingPage packs={packs} />;
}

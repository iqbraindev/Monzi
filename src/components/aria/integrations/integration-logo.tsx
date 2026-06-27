"use client";

import { useState } from "react";

import type { AppGlyph, Integration } from "@/lib/aria/types";
import { integrationFromToolkitSlug, toolkitLogoUrl } from "@/lib/composio/toolkits";
import { cn } from "@/lib/utils";

function GlyphTile({
  glyph,
  bg,
  fg,
  size,
  radius,
  className,
  bare,
}: {
  glyph: string;
  bg: string;
  fg: string;
  size: number;
  radius: number;
  className?: string;
  bare?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center font-heading font-bold",
        className
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bare ? "transparent" : bg,
        color: bare ? bg : fg,
        fontSize: size * 0.42,
      }}
    >
      {glyph}
    </span>
  );
}

function LogoImage({
  slug,
  name,
  size,
  radius,
  className,
  onError,
  bare,
}: {
  slug: string;
  name: string;
  size: number;
  radius: number;
  className?: string;
  onError: () => void;
  bare?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 overflow-hidden",
        bare ? "bg-transparent" : "border border-aria-border/50 bg-white",
        className
      )}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <img
        src={toolkitLogoUrl(slug)}
        alt={`${name} logo`}
        width={size}
        height={size}
        className={cn(
          "size-full object-contain",
          bare ? "p-0" : size <= 28 ? "p-0.5" : "p-1.5"
        )}
        onError={onError}
      />
    </span>
  );
}

export function IntegrationLogo({
  app,
  size,
  radius = 10,
  className,
}: {
  app: Integration;
  size: number;
  radius?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const slug = app.toolkitSlug;

  if (slug && !failed) {
    return (
      <LogoImage
        slug={slug}
        name={app.name}
        size={size}
        radius={radius}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <GlyphTile
      glyph={app.glyph}
      bg={app.bg}
      fg={app.fg}
      size={size}
      radius={radius}
      className={className}
    />
  );
}

export function ToolkitLogo({
  slug,
  size,
  radius = 7,
  className,
}: {
  slug: string;
  size: number;
  radius?: number;
  className?: string;
}) {
  const integration = integrationFromToolkitSlug(slug);
  if (!integration) return null;
  return (
    <IntegrationLogo
      app={integration}
      size={size}
      radius={radius}
      className={className}
    />
  );
}

export function AppLogo({
  app,
  size,
  radius = 7,
  className,
  bare,
}: {
  app: AppGlyph;
  size: number;
  radius?: number;
  className?: string;
  bare?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const slug = app.toolkitSlug;

  if (slug && !failed) {
    return (
      <LogoImage
        slug={slug}
        name={app.name}
        size={size}
        radius={radius}
        className={className}
        onError={() => setFailed(true)}
        bare={bare}
      />
    );
  }

  return (
    <GlyphTile
      glyph={app.glyph}
      bg={app.color}
      fg={app.fg ?? "#fff"}
      size={size}
      radius={radius}
      className={className}
      bare={bare}
    />
  );
}

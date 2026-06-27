import Image from "next/image";
import type { CSSProperties } from "react";

import { AgentOrb } from "@/components/aria/agent-orb";
import {
  getAgentAvatarFaceCrop,
  getAgentAvatarFaceImageSize,
  getAgentAvatarFaceTop,
  getAgentAvatarImage,
  getAgentAvatarLauncherBlend,
} from "@/lib/agents/avatars";
import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  assetId?: string | null;
  color: string;
  size?: number;
  breathe?: boolean;
  className?: string;
  alt?: string;
  /** Circle crops to the face; full shows the standing character. */
  variant?: "circle" | "full";
  /** Subtle pulsing neon glow for the full-body launcher. */
  neon?: boolean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function launcherGlowVars(color: string): CSSProperties {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return {
      ["--launcher-glow" as string]: "rgba(124, 58, 237, 0.38)",
      ["--launcher-glow-soft" as string]: "rgba(124, 58, 237, 0.16)",
    };
  }

  return {
    ["--launcher-glow" as string]: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.38)`,
    ["--launcher-glow-soft" as string]: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`,
  };
}

/** Face-only crop used inside circular avatar frames. */
export function AgentAvatarFaceImage({
  assetId,
  alt,
  displaySize,
}: {
  assetId: string;
  alt: string;
  displaySize: number;
}) {
  const image = getAgentAvatarImage(assetId);
  if (!image) return null;

  const crop = getAgentAvatarFaceCrop(assetId);
  const scaled = displaySize * crop.scale;
  const top = getAgentAvatarFaceTop(displaySize, assetId);
  const loadSize = getAgentAvatarFaceImageSize(displaySize, assetId);

  return (
    <span
      className="absolute left-1/2 -translate-x-1/2"
      style={{
        width: scaled,
        height: scaled,
        top,
      }}
    >
      <Image
        src={image}
        alt={alt}
        fill
        sizes={`${loadSize}px`}
        quality={95}
        className="object-cover"
        style={{
          objectPosition: crop.objectPosition,
          mixBlendMode: crop.blendMode,
        }}
      />
    </span>
  );
}

/** Agent portrait — uses a selected avatar image when available, otherwise the color orb. */
export function AgentAvatar({
  assetId,
  color,
  size = 32,
  breathe = false,
  className,
  alt = "",
  variant = "circle",
  neon = false,
}: AgentAvatarProps) {
  const image = getAgentAvatarImage(assetId);

  if (image) {
    if (variant === "full") {
      const height = size;
      const width = Math.round(size * (image.width / image.height));
      const blend = getAgentAvatarLauncherBlend(assetId);

      return (
        <span
          className={cn(
            "relative inline-flex shrink-0 bg-transparent",
            breathe && "aria-breathe",
            className
          )}
          style={{ width, height, ...launcherGlowVars(color) }}
        >
          <Image
            src={image}
            alt={alt}
            fill
            sizes={`${width}px`}
            className={cn(
              "object-contain object-bottom bg-transparent",
              neon &&
                (blend === "lighten"
                  ? "agent-launcher-avatar-lighten"
                  : "agent-launcher-avatar-multiply")
            )}
          />
        </span>
      );
    }

    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-full bg-aria-elevated",
          breathe && "aria-breathe",
          className
        )}
        style={{
          width: size,
          height: size,
          boxShadow: `0 0 ${Math.round(size / 2.5)}px ${color}88`,
        }}
      >
        {assetId && (
          <AgentAvatarFaceImage
            assetId={assetId}
            alt={alt}
            displaySize={size}
          />
        )}
      </span>
    );
  }

  return (
    <AgentOrb
      color={color}
      size={size}
      breathe={breathe}
      className={className}
    />
  );
}

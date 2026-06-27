import type { CSSProperties } from "react";
import type { StaticImageData } from "next/image";

import av1 from "@/avatars/av1.png";
import av2 from "@/avatars/av2.png";
import av3 from "@/avatars/av3.png";
import av4 from "@/avatars/av4.png";
import av5 from "@/avatars/av5.png";
import av6 from "@/avatars/av6.png";
import av7 from "@/avatars/av7.png";
import av8 from "@/avatars/av8.png";

/** Maps stored `avatar.asset_id` values to bundled avatar images. */
export const AGENT_AVATAR_IMAGES: Record<string, StaticImageData> = {
  "avatar-01": av1,
  "avatar-02": av2,
  "avatar-03": av3,
  "avatar-04": av4,
  "avatar-05": av5,
  "avatar-06": av6,
  "avatar-07": av7,
  "avatar-08": av8,
};

export function getAgentAvatarImage(
  assetId?: string | null
): StaticImageData | undefined {
  if (!assetId) return undefined;
  return AGENT_AVATAR_IMAGES[assetId];
}

export function isKnownAgentAvatar(assetId?: string | null): boolean {
  return Boolean(assetId && assetId in AGENT_AVATAR_IMAGES);
}

/** How to knock out each avatar's backdrop on the dark launcher. */
export function getAgentAvatarLauncherBlend(
  assetId?: string | null
): "multiply" | "lighten" {
  if (!assetId) return "multiply";
  // Portrait renders on black; square renders on white.
  if (["avatar-03", "avatar-06", "avatar-07", "avatar-08"].includes(assetId)) {
    return "lighten";
  }
  return "multiply";
}

/** Face framing for circular avatar displays. */
export function getAgentAvatarFaceCrop(assetId?: string | null): {
  scale: number;
  originY: number;
  objectPosition: string;
  blendMode: "multiply" | "lighten";
} {
  const portrait =
    assetId &&
    ["avatar-03", "avatar-06", "avatar-07", "avatar-08"].includes(assetId);

  if (portrait) {
    return {
      scale: 3.1,
      originY: 0.07,
      objectPosition: "50% 0%",
      blendMode: "lighten",
    };
  }

  return {
    scale: 4.2,
    originY: 0.13,
    objectPosition: "50% 2%",
    blendMode: "multiply",
  };
}

/** Pixel width Next.js should fetch for a face crop at `displaySize`. */
export function getAgentAvatarFaceImageSize(
  displaySize: number,
  assetId?: string | null
): number {
  const crop = getAgentAvatarFaceCrop(assetId);
  return Math.ceil(displaySize * crop.scale * 2);
}

/** Top offset when rendering a face crop without CSS scale (keeps image sharp). */
export function getAgentAvatarFaceTop(
  displaySize: number,
  assetId?: string | null
): number {
  const crop = getAgentAvatarFaceCrop(assetId);
  return displaySize * crop.originY * (1 - crop.scale);
}

/** @deprecated Use getAgentAvatarFaceCrop() — kept for avatar picker styles. */
export function getAgentAvatarFaceCropVars(
  assetId?: string | null
): CSSProperties {
  const crop = getAgentAvatarFaceCrop(assetId);
  return {
    ["--avatar-face-scale" as string]: String(crop.scale),
    ["--avatar-face-y" as string]: crop.objectPosition.split(" ")[1] ?? "2%",
    ["--avatar-face-origin-y" as string]: `${crop.originY * 100}%`,
  };
}

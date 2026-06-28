import Link from "next/link";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";

import logoMozi from "@/assets/logo-mozi.png";
import monziIcon from "@/assets/monzi-icon.png";
import { cn } from "@/lib/utils";

/** Bundled asset — Next.js hashes the URL when the file changes. */
const LOGO_SRC = logoMozi.src;
const LOGO_ASPECT = logoMozi.width / logoMozi.height;

/** Prominent wordmark for marketing + auth headers. */
export const MONZI_LOGO_PROMO_STYLE: CSSProperties = {
  width: "auto",
  height: 64,
};

/** Compact wordmark for in-app chrome (topbars). */
export const MONZI_LOGO_APP_STYLE: CSSProperties = {
  width: "auto",
  height: 36,
};

/** Pixel heights — inline style overrides Tailwind preflight `img { height: auto }`. */
const HEIGHT_PX = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 40,
} as const;

type MonziLogoSize = keyof typeof HEIGHT_PX;

type MonziLogoProps = {
  size?: MonziLogoSize;
  className?: string;
  href?: string;
} & Omit<ComponentPropsWithoutRef<"img">, "src" | "alt" | "height" | "width">;

function resolveHeightPx(size: MonziLogoSize, style?: CSSProperties): number {
  const custom = style?.height;
  if (typeof custom === "number" && !Number.isNaN(custom)) return custom;
  if (typeof custom === "string") {
    const parsed = parseFloat(custom);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return HEIGHT_PX[size];
}

function usesAutoWidth(style?: CSSProperties): boolean {
  return style?.width === "auto";
}

export function MonziLogo({
  size = "md",
  className,
  href,
  style,
  ...props
}: MonziLogoProps) {
  const heightPx = resolveHeightPx(size, style);
  const widthPx = Math.round(heightPx * LOGO_ASPECT);
  const autoWidth = usesAutoWidth(style);

  const imageStyle: CSSProperties = autoWidth
    ? {
        ...style,
        height: heightPx,
        width: "auto",
        maxHeight: heightPx,
      }
    : {
        ...style,
        height: heightPx,
        width: widthPx,
        minWidth: widthPx,
        minHeight: heightPx,
        maxHeight: heightPx,
        maxWidth: widthPx,
      };

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt="Monzi"
      width={widthPx}
      height={heightPx}
      decoding="async"
      className={cn("block shrink-0 object-contain object-left", className)}
      style={imageStyle}
      {...props}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center leading-none">
        {image}
      </Link>
    );
  }

  return image;
}

/** Square mark for metadata / favicon / apple touch icon. */
export const MONZI_LOGO_ICON = monziIcon.src;

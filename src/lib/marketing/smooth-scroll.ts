const HEADER_OFFSET_PX = 64;

let activeScrollFrame: number | null = null;

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

function getScrollDuration(distance: number): number {
  return Math.min(1100, Math.max(550, Math.abs(distance) * 0.55));
}

function cancelActiveScroll() {
  if (activeScrollFrame !== null) {
    cancelAnimationFrame(activeScrollFrame);
    activeScrollFrame = null;
  }
}

export function smoothScrollToId(
  id: string,
  options?: {
    offset?: number;
    onComplete?: () => void;
  }
): boolean {
  const target = document.getElementById(id);
  if (!target) return false;

  cancelActiveScroll();

  const offset = options?.offset ?? HEADER_OFFSET_PX;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const startY = window.scrollY;
  const endY = target.getBoundingClientRect().top + window.scrollY - offset;
  const distance = endY - startY;

  if (Math.abs(distance) < 2) {
    options?.onComplete?.();
    return true;
  }

  if (prefersReducedMotion) {
    window.scrollTo({ top: endY, behavior: "auto" });
    options?.onComplete?.();
    return true;
  }

  const duration = getScrollDuration(distance);
  const startTime = performance.now();

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * easeOutQuint(progress));

    if (progress < 1) {
      activeScrollFrame = requestAnimationFrame(step);
    } else {
      activeScrollFrame = null;
      options?.onComplete?.();
    }
  };

  activeScrollFrame = requestAnimationFrame(step);
  return true;
}

export function smoothScrollToHash(
  hash: string,
  options?: {
    offset?: number;
    onComplete?: () => void;
  }
): boolean {
  if (!hash.startsWith("#")) return false;
  const id = hash.slice(1);
  if (!id) return false;
  return smoothScrollToId(id, options);
}

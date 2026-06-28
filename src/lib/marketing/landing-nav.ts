/** Landing page section anchors — order matches scroll order on the page. */
export const LANDING_NAV_LINKS = [
  { label: "Integrations", href: "#integrations" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
] as const;

export const LANDING_SECTION_IDS = LANDING_NAV_LINKS.map((link) =>
  link.href.slice(1)
);

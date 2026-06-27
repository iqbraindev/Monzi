export function workspaceSlugFromName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  if (base) return base;
  return `workspace-${crypto.randomUUID().slice(0, 8)}`;
}

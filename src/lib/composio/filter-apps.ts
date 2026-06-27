/** Keep only apps that are both assigned to the agent and connected on the account. */
export function filterComposioAppsForConnected(
  agentApps: string[],
  connectedSlugs: string[]
): string[] {
  const connected = new Set(connectedSlugs);
  return agentApps.filter((slug) => connected.has(slug));
}

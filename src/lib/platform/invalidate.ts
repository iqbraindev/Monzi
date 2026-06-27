import { bustPlatformConfigCache } from "@/lib/platform/config";
import { resetComposioClients } from "@/lib/composio/client";
import { resetStripeClient } from "@/lib/stripe/client";

export function invalidateIntegrationCaches(provider?: string): void {
  bustPlatformConfigCache();
  resetComposioClients();
  resetStripeClient();

  void provider;
}

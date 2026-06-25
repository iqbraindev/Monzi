import { Suspense } from "react";

import { IntegrationsView } from "@/components/aria/integrations/integrations-view";

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-sm text-aria-text-muted">
          Loading integrations…
        </div>
      }
    >
      <IntegrationsView />
    </Suspense>
  );
}

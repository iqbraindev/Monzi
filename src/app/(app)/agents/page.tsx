import { Suspense } from "react";

import { AgentsPageClient } from "@/components/aria/agents/agents-page-client";

export default function AgentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-sm text-aria-text-muted">Loading agents…</div>
      }
    >
      <AgentsPageClient />
    </Suspense>
  );
}

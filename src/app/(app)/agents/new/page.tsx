import { Suspense } from "react";

import { AgentBuilderNewClient } from "@/components/aria/agents/builder/agent-builder-new-client";

export default function NewAgentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-10 text-sm text-aria-text-muted">
          Loading…
        </div>
      }
    >
      <AgentBuilderNewClient />
    </Suspense>
  );
}

import { Suspense } from "react";

import { AgentBuilderStudio } from "@/components/aria/agents/builder/agent-builder-studio";

export default async function AgentSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-10 text-sm text-aria-text-muted">
          Loading settings…
        </div>
      }
    >
      <AgentBuilderStudio agentId={id} voiceAllowed />
    </Suspense>
  );
}

import { Suspense } from "react";

import { AgentChatPageClient } from "@/components/aria/agents/agent-chat-page-client";

export default async function AgentChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-10 text-sm text-aria-text-muted">
          Loading agent…
        </div>
      }
    >
      <AgentChatPageClient agentId={id} />
    </Suspense>
  );
}

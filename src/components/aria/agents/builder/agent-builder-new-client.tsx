"use client";

import { useSearchParams } from "next/navigation";

import { AgentBuilderWizard } from "@/components/aria/agents/builder/agent-builder-wizard";
import { QuickCreateForm } from "@/components/aria/agents/builder/quick-create-form";

export function AgentBuilderNewClient() {
  const searchParams = useSearchParams();
  const isQuick = searchParams.get("quick") === "1";

  if (isQuick) {
    return <QuickCreateForm />;
  }

  return <AgentBuilderWizard voiceAllowed />;
}

import { auth } from "@clerk/nextjs/server";
import type { UIMessage } from "ai";

import {
  executeAgentTurn,
  persistUserMessage,
  prepareAgentTurn,
} from "@/lib/agents/run-agent-turn";
import { assertAgentHasEnergy } from "@/lib/billing/energy";
import { formatAiErrorMessage } from "@/lib/ai/user-facing-errors";
import {
  getConnectionHintsForWidgetTypes,
  listDashboards,
} from "@/lib/dashboard/service";
import { getComposioScope } from "@/lib/composio/scope";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";
import {
  assertMemberCanMutate,
  memberAccessDeniedResponse,
} from "@/lib/rbac/member-access";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export const maxDuration = 60;

function buildDashboardCreationMessage(params: {
  prompt: string;
  name?: string;
}): string {
  const nameHint = params.name?.trim()
    ? `Suggested name: "${params.name.trim()}".`
    : "Choose a short, descriptive dashboard name from the request.";

  return `[MONZI_DASHBOARD_CREATE] Create a new dashboard for me. ${nameHint} User request: "${params.prompt.trim()}". Include all relevant widgets with a sensible 12-column grid layout (non-overlapping positions). Add widgets even if their apps are not connected — the UI will prompt the user to connect. Use create_dashboard with widgets in one call when possible.`;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);
    const ctx = await resolveWorkspaceContext(userId, { request: req });

    try {
      assertMemberCanMutate(ctx);
    } catch (err) {
      return memberAccessDeniedResponse(err);
    }

    const body = (await req.json()) as {
      agentId?: string;
      prompt?: string;
      name?: string;
      icon?: string;
    };

    const prompt = body.prompt?.trim();
    if (!body.agentId || !prompt) {
      return Response.json(
        { error: "agentId and prompt are required" },
        { status: 400 }
      );
    }

    const composioScope = getComposioScope(ctx);
    const turnCtx = await prepareAgentTurn({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      ownerUserId: ctx.ownerUserId,
      composioScope,
      agentId: body.agentId,
    });

    if (!turnCtx) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    const energyCheck = await assertAgentHasEnergy(
      ctx.ownerUserId,
      ctx.workspaceId,
      turnCtx.agent
    );
    if (!energyCheck.ok) {
      return Response.json({ error: energyCheck.message }, { status: 402 });
    }

    const userText = buildDashboardCreationMessage({
      prompt,
      name: body.name,
    });

    const supabase = getSupabaseAdmin();
    const dashboardsBefore = await listDashboards(supabase, ctx.workspaceId);

    await persistUserMessage(turnCtx, userText);

    const messages: UIMessage[] = [
      {
        id: "dashboard-create-user",
        role: "user",
        parts: [{ type: "text", text: userText }],
      },
    ];

    const result = await executeAgentTurn(turnCtx, messages);

    const dashboardsAfter = await listDashboards(supabase, ctx.workspaceId);

    const newDashboard =
      dashboardsAfter.find(
        (d) => !dashboardsBefore.some((prev) => prev.id === d.id)
      ) ??
      dashboardsAfter.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

    if (!newDashboard) {
      return Response.json(
        {
          error: "Agent did not create a dashboard",
          assistantMessage: result.assistantText,
        },
        { status: 422 }
      );
    }

    const connectionHints = await getConnectionHintsForWidgetTypes(
      ctx.workspaceId,
      newDashboard.widgets.map((w) => w.type),
      composioScope
    );

    return Response.json({
      dashboardId: newDashboard.id,
      dashboard: newDashboard,
      widgets: newDashboard.widgets,
      assistantMessage: result.assistantText,
      connectionHints,
    });
  } catch (err) {
    const message = formatAiErrorMessage(err);
    console.error("[dashboard from-prompt POST]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

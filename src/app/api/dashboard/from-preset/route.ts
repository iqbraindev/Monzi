import { auth } from "@clerk/nextjs/server";

import {
  getDashboardPreset,
  resolvePresetWidgets,
} from "@/lib/dashboard/dashboard-presets";
import { createDashboardWithWidgets } from "@/lib/dashboard/service";
import { getComposioScope } from "@/lib/composio/scope";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";
import {
  assertMemberCanMutate,
  memberAccessDeniedResponse,
} from "@/lib/rbac/member-access";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

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
      presetId?: string;
      name?: string;
      icon?: string;
      widgetTypes?: string[];
    };

    if (!body.presetId) {
      return Response.json({ error: "presetId is required" }, { status: 400 });
    }

    const preset = getDashboardPreset(body.presetId);
    if (!preset) {
      return Response.json({ error: "Unknown preset" }, { status: 400 });
    }

    const name = body.name?.trim() || preset.name;
    const icon = body.icon ?? preset.icon;
    const widgets = resolvePresetWidgets(preset, body.widgetTypes);

    const supabase = getSupabaseAdmin();
    const result = await createDashboardWithWidgets(supabase, {
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      ownerUserId: ctx.ownerUserId,
      name,
      icon,
      createdBy: "user",
      widgets: widgets.map((widget) => ({
        type: widget.type,
        title: widget.title,
        layout: widget.layout,
      })),
      composioScope: getComposioScope(ctx),
      autoSwitch: true,
    });

    return Response.json({
      dashboard: result.dashboard,
      widgets: result.widgets,
      connectionHints: result.connectionHints,
      skippedWidgets: result.skippedWidgets,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create dashboard";
    console.error("[dashboard from-preset POST]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

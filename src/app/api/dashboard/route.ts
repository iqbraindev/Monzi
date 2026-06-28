import { auth } from "@clerk/nextjs/server";

import { canCreateDashboard } from "@/lib/billing/limit-enforcer";
import { createDashboard, listDashboards } from "@/lib/dashboard/service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";
import {
  assertMemberCanMutate,
  filterByMemberAccess,
  getMemberAccess,
  memberAccessDeniedResponse,
} from "@/lib/rbac/member-access";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);
    const ctx = await resolveWorkspaceContext(userId, { request: req });

    const supabase = getSupabaseAdmin();
    let dashboards = await listDashboards(supabase, ctx.workspaceId);

    const memberAccess = await getMemberAccess(ctx);
    if (memberAccess) {
      dashboards = filterByMemberAccess(dashboards, memberAccess.allowedDashboardIds);
    }

    return Response.json({ dashboards });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load dashboards";
    console.error("[dashboard GET]", err);
    return Response.json({ error: message }, { status: 500 });
  }
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
      name?: string;
      icon?: string;
      description?: string;
    };

    const name = body.name?.trim();
    if (!name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const dashboardCheck = await canCreateDashboard(
      ctx.workspaceId,
      ctx.ownerUserId
    );
    if (!dashboardCheck.ok) {
      return Response.json(dashboardCheck.error, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const dashboard = await createDashboard(supabase, {
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      name,
      icon: body.icon,
      description: body.description,
      createdBy: "user",
    });

    return Response.json({ dashboard });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create dashboard";
    console.error("[dashboard POST]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

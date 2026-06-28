import { auth } from "@clerk/nextjs/server";

import {
  assertCanManageWorkspace,
  memberAccessDeniedResponse,
} from "@/lib/rbac/member-access";
import {
  removeWorkspaceMember,
  upsertMemberPermissions,
} from "@/lib/subaccounts/service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId: authUserId } = await auth();
  if (!authUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId: memberUserId } = await params;
  const ctx = await resolveWorkspaceContext(authUserId, { request: req });

  try {
    assertCanManageWorkspace(ctx);
  } catch (err) {
    return memberAccessDeniedResponse(err);
  }

  let body: {
    allowedAgentIds?: string[];
    allowedDashboardIds?: string[];
    aiMessagesMonthlyLimit?: number;
    suspended?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", ctx.workspaceId)
    .eq("user_id", memberUserId)
    .eq("role", "member")
    .maybeSingle();

  if (!membership) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  try {
    if (
      body.allowedAgentIds !== undefined ||
      body.allowedDashboardIds !== undefined ||
      body.aiMessagesMonthlyLimit !== undefined
    ) {
      await upsertMemberPermissions(
        ctx.workspaceId,
        memberUserId,
        ctx.ownerUserId,
        {
          allowedAgentIds: body.allowedAgentIds,
          allowedDashboardIds: body.allowedDashboardIds,
          aiMessagesMonthlyLimit: body.aiMessagesMonthlyLimit,
        }
      );
    }

    if (body.suspended !== undefined && !memberUserId.startsWith("invite_")) {
      await supabase
        .from("users")
        .update({ is_active: !body.suspended })
        .eq("id", memberUserId);
    }

    return Response.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update member";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { userId: authUserId } = await auth();
  if (!authUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId: memberUserId } = await params;
  const ctx = await resolveWorkspaceContext(authUserId, { request: req });

  try {
    assertCanManageWorkspace(ctx);
  } catch (err) {
    return memberAccessDeniedResponse(err);
  }

  try {
    await removeWorkspaceMember(ctx.workspaceId, memberUserId);
    return Response.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to remove member";
    return Response.json({ error: message }, { status: 500 });
  }
}

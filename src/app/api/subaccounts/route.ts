import { auth } from "@clerk/nextjs/server";

import { canCreateSubaccount } from "@/lib/billing/limit-enforcer";
import {
  assertCanManageWorkspace,
  memberAccessDeniedResponse,
  MemberAccessDeniedError,
} from "@/lib/rbac/member-access";
import {
  addMemberToWorkspace,
  createInvitePlaceholder,
  findUserByEmail,
  listWorkspaceMembers,
  upsertMemberPermissions,
} from "@/lib/subaccounts/service";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(userId, { request: req });

  try {
    assertCanManageWorkspace(ctx);
  } catch (err) {
    return memberAccessDeniedResponse(err);
  }

  try {
    const members = await listWorkspaceMembers(ctx.workspaceId);
    return Response.json({ members });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load members";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(userId, { request: req });

  try {
    assertCanManageWorkspace(ctx);
  } catch (err) {
    return memberAccessDeniedResponse(err);
  }

  let body: {
    email?: string;
    fullName?: string;
    allowedAgentIds?: string[];
    allowedDashboardIds?: string[];
    aiMessagesMonthlyLimit?: number;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const check = await canCreateSubaccount(ctx.workspaceId, ctx.ownerUserId);
  if (!check.ok) {
    return Response.json(check.error, { status: 403 });
  }

  try {
    const existingUser = await findUserByEmail(email);
    let memberUserId = existingUser?.id;

    if (!memberUserId) {
      memberUserId = await createInvitePlaceholder(email, body.fullName);
    }

    await addMemberToWorkspace(ctx.workspaceId, memberUserId, "member");
    await upsertMemberPermissions(ctx.workspaceId, memberUserId, ctx.ownerUserId, {
      allowedAgentIds: body.allowedAgentIds ?? [],
      allowedDashboardIds: body.allowedDashboardIds ?? [],
      aiMessagesMonthlyLimit: body.aiMessagesMonthlyLimit,
    });

    return Response.json(
      {
        member: {
          userId: memberUserId,
          email,
          role: "member",
          status: existingUser?.is_active ? "added" : "invited",
          permissions: {
            allowedAgentIds: body.allowedAgentIds ?? [],
            allowedDashboardIds: body.allowedDashboardIds ?? [],
            aiMessagesMonthlyLimit: body.aiMessagesMonthlyLimit ?? 50,
          },
        },
        message: existingUser?.is_active
          ? "Member added to this workspace with the selected access."
          : "Invitation sent. They must sign up with this email to access your workspace.",
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof MemberAccessDeniedError) {
      return memberAccessDeniedResponse(err);
    }
    const message = err instanceof Error ? err.message : "Failed to invite member";
    return Response.json({ error: message }, { status: 500 });
  }
}

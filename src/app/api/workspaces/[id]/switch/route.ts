import { auth } from "@clerk/nextjs/server";

import {
  resolveWorkspaceContext,
  setWorkspaceCookie,
} from "@/lib/workspaces/context";
import { getWorkspaceMembership } from "@/lib/workspaces/service";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await getWorkspaceMembership(userId, id);
  if (!membership) {
    return Response.json({ error: "Workspace not found" }, { status: 404 });
  }

  await setWorkspaceCookie(id);

  const ctx = await resolveWorkspaceContext(userId, { workspaceId: id });
  return Response.json({
    workspace: membership.workspace,
    memberRole: membership.role,
    context: ctx,
  });
}

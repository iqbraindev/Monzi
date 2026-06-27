import { auth } from "@clerk/nextjs/server";

import {
  deleteWorkspace,
  getWorkspaceMembership,
  updateWorkspaceProfile,
} from "@/lib/workspaces/service";
import type { WorkspaceProfileInput } from "@/lib/workspaces/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: WorkspaceProfileInput;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    body.name === undefined &&
    body.description === undefined &&
    body.activity_domain === undefined
  ) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  if (body.name !== undefined && !body.name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const membership = await getWorkspaceMembership(userId, id);
  if (!membership || membership.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const workspace = await updateWorkspaceProfile(
      id,
      membership.workspace.owner_user_id,
      body
    );
    return Response.json({ workspace });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update workspace";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await getWorkspaceMembership(userId, id);
  if (!membership || membership.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deleteWorkspace(id, membership.workspace.owner_user_id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete workspace";
    return Response.json({ error: message }, { status: 500 });
  }
}

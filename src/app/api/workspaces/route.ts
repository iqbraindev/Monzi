import { auth } from "@clerk/nextjs/server";

import { canCreateWorkspace } from "@/lib/billing/limit-enforcer";
import { countOwnedWorkspaces } from "@/lib/workspaces/service";
import {
  createWorkspaceForOwner,
  listUserWorkspaces,
} from "@/lib/workspaces/service";
import { ensureSupabaseUser } from "@/lib/users/provision";
import { getOwnerPackLimits } from "@/lib/billing/limit-enforcer";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseUser(userId);
    const workspaces = await listUserWorkspaces(userId);
    const ownedCount = await countOwnedWorkspaces(userId);
    const limits = await getOwnerPackLimits(userId);

    return Response.json({
      workspaces,
      meta: {
        ownedCount,
        maxWorkspaces: limits.max_workspaces,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list workspaces";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?: string;
    description?: string | null;
    activity_domain?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    await ensureSupabaseUser(userId);

    const check = await canCreateWorkspace(userId);
    if (!check.ok) {
      return Response.json(check.error, { status: 403 });
    }

    const workspace = await createWorkspaceForOwner(userId, name, {
      description: body.description,
      activity_domain: body.activity_domain,
    });
    return Response.json({ workspace }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create workspace";
    return Response.json({ error: message }, { status: 500 });
  }
}

import { cookies } from "next/headers";

import {
  WORKSPACE_COOKIE,
  WORKSPACE_COOKIE_OPTIONS,
} from "@/lib/workspaces/cookie";
import {
  ensureDefaultWorkspace,
  getDefaultWorkspaceForUser,
  getWorkspaceMembership,
} from "@/lib/workspaces/service";
import type { WorkspaceContext } from "@/lib/workspaces/types";

export async function readWorkspaceCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(WORKSPACE_COOKIE)?.value ?? null;
}

export async function setWorkspaceCookie(workspaceId: string): Promise<void> {
  const store = await cookies();
  store.set(WORKSPACE_COOKIE, workspaceId, WORKSPACE_COOKIE_OPTIONS);
}

export async function clearWorkspaceCookie(): Promise<void> {
  const store = await cookies();
  store.delete(WORKSPACE_COOKIE);
}

function readHeaderWorkspaceId(request?: Request): string | null {
  if (!request) return null;
  const fromHeader = request.headers.get("x-monzi-workspace-id");
  return fromHeader?.trim() || null;
}

export async function resolveWorkspaceContext(
  userId: string,
  options?: { workspaceId?: string | null; request?: Request }
): Promise<WorkspaceContext> {
  const candidates = [
    options?.workspaceId?.trim(),
    readHeaderWorkspaceId(options?.request),
    await readWorkspaceCookie(),
  ].filter(Boolean) as string[];

  for (const workspaceId of candidates) {
    const membership = await getWorkspaceMembership(userId, workspaceId);
    if (membership) {
      return {
        userId,
        workspaceId: membership.workspace.id,
        ownerUserId: membership.workspace.owner_user_id,
        memberRole: membership.role,
        isDefaultWorkspace: membership.workspace.is_default,
      };
    }
  }

  const defaultWorkspace =
    (await getDefaultWorkspaceForUser(userId)) ??
    (await ensureDefaultWorkspace(userId));

  return {
    userId,
    workspaceId: defaultWorkspace.id,
    ownerUserId: defaultWorkspace.owner_user_id,
    memberRole: defaultWorkspace.member_role,
    isDefaultWorkspace: defaultWorkspace.is_default,
  };
}

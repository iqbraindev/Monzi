import { deleteWorkspaceLogo } from "@/lib/workspaces/logo-storage";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { workspaceSlugFromName } from "@/lib/workspaces/slug";
import type {
  WorkspaceMemberRole,
  WorkspaceProfileInput,
  WorkspaceRow,
  WorkspaceWithRole,
} from "@/lib/workspaces/types";

const WORKSPACE_COLUMNS =
  "id, owner_user_id, name, slug, description, activity_domain, logo_url, is_default, created_at, updated_at";

export async function listUserWorkspaces(
  userId: string
): Promise<WorkspaceWithRole[]> {
  const supabase = getSupabaseAdmin();

  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId);

  if (membersError) throw new Error(membersError.message);
  if (!members?.length) return [];

  const workspaceIds = members.map((m) => m.workspace_id);
  const { data: workspaces, error: workspacesError } = await supabase
    .from("workspaces")
    .select(WORKSPACE_COLUMNS)
    .in("id", workspaceIds);

  if (workspacesError) throw new Error(workspacesError.message);

  const roleByWorkspaceId = new Map(
    members.map((m) => [m.workspace_id, m.role as WorkspaceMemberRole])
  );

  return (workspaces ?? [])
    .map((workspace) => {
      const memberRole = roleByWorkspaceId.get(workspace.id);
      if (!memberRole) return null;
      return {
        ...(workspace as WorkspaceRow),
        member_role: memberRole,
      };
    })
    .filter((w): w is WorkspaceWithRole => w != null)
    .sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export async function getWorkspaceMembership(
  userId: string,
  workspaceId: string
): Promise<{ workspace: WorkspaceRow; role: WorkspaceMemberRole } | null> {
  const supabase = getSupabaseAdmin();

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (memberError) throw new Error(memberError.message);
  if (!member) return null;

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select(WORKSPACE_COLUMNS)
    .eq("id", workspaceId)
    .maybeSingle();

  if (workspaceError) throw new Error(workspaceError.message);
  if (!workspace) return null;

  return {
    workspace: workspace as WorkspaceRow,
    role: member.role as WorkspaceMemberRole,
  };
}

export async function countOwnedWorkspaces(ownerUserId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("workspaces")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", ownerUserId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getDefaultWorkspaceForUser(
  userId: string
): Promise<WorkspaceWithRole | null> {
  const workspaces = await listUserWorkspaces(userId);
  return (
    workspaces.find((w) => w.is_default) ??
    workspaces[0] ??
    null
  );
}

export async function bootstrapWorkspaceResources(
  workspaceId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: existingAgent } = await supabase
    .from("agents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("is_default", true)
    .maybeSingle();

  if (!existingAgent) {
    const { error: agentError } = await supabase.from("agents").insert({
      workspace_id: workspaceId,
      user_id: userId,
      name: "Monzi",
      slug: "aria",
      role: "general_assistant",
      is_default: true,
    });
    if (agentError) throw new Error(agentError.message);
  }

  const { data: existingDashboard } = await supabase
    .from("dashboards")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("is_default", true)
    .maybeSingle();

  if (!existingDashboard) {
    const { error: dashboardError } = await supabase.from("dashboards").insert({
      workspace_id: workspaceId,
      user_id: userId,
      name: "My Dashboard",
      is_default: true,
    });
    if (dashboardError) throw new Error(dashboardError.message);
  }
}

export async function createWorkspaceForOwner(
  ownerUserId: string,
  name: string,
  options?: {
    isDefault?: boolean;
    description?: string | null;
    activity_domain?: string | null;
  }
): Promise<WorkspaceRow> {
  const supabase = getSupabaseAdmin();
  const trimmedName = name.trim() || "My Workspace";
  const description = normalizeOptionalText(options?.description);
  const activityDomain = normalizeOptionalText(options?.activity_domain);
  let slug = workspaceSlugFromName(trimmedName);

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidateSlug =
      attempt === 0 ? slug : `${slug}-${crypto.randomUUID().slice(0, 6)}`;

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({
        owner_user_id: ownerUserId,
        name: trimmedName,
        slug: candidateSlug,
        description,
        activity_domain: activityDomain,
        is_default: options?.isDefault ?? false,
      })
      .select("*")
      .single();

    if (!error && workspace) {
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: ownerUserId,
          role: "owner",
        });

      if (memberError) {
        await supabase.from("workspaces").delete().eq("id", workspace.id);
        throw new Error(memberError.message);
      }

      try {
        await bootstrapWorkspaceResources(workspace.id, ownerUserId);
      } catch (bootstrapError) {
        await supabase.from("workspaces").delete().eq("id", workspace.id);
        throw bootstrapError;
      }

      return workspace as WorkspaceRow;
    }

    if (error?.code !== "23505") {
      throw new Error(error?.message ?? "Failed to create workspace");
    }

    slug = candidateSlug;
  }

  throw new Error("Failed to create workspace");
}

export async function updateWorkspaceProfile(
  workspaceId: string,
  ownerUserId: string,
  input: WorkspaceProfileInput
): Promise<WorkspaceRow> {
  const supabase = getSupabaseAdmin();
  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    const trimmedName = input.name.trim();
    if (!trimmedName) throw new Error("Name is required");
    updates.name = trimmedName;
  }
  if (input.description !== undefined) {
    updates.description = normalizeOptionalText(input.description);
  }
  if (input.activity_domain !== undefined) {
    updates.activity_domain = normalizeOptionalText(input.activity_domain);
  }

  const { data, error } = await supabase
    .from("workspaces")
    .update(updates)
    .eq("id", workspaceId)
    .eq("owner_user_id", ownerUserId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update workspace");
  }

  return data as WorkspaceRow;
}

export async function updateWorkspaceLogoUrl(
  workspaceId: string,
  ownerUserId: string,
  logoUrl: string | null
): Promise<WorkspaceRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("workspaces")
    .update({
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId)
    .eq("owner_user_id", ownerUserId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update workspace logo");
  }

  return data as WorkspaceRow;
}

/** @deprecated Use updateWorkspaceProfile */
export async function updateWorkspaceName(
  workspaceId: string,
  ownerUserId: string,
  name: string
): Promise<WorkspaceRow> {
  return updateWorkspaceProfile(workspaceId, ownerUserId, { name });
}

export async function deleteWorkspace(
  workspaceId: string,
  ownerUserId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, is_default")
    .eq("id", workspaceId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (!workspace) throw new Error("Workspace not found");
  if (workspace.is_default) {
    throw new Error("Cannot delete your default workspace");
  }

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (error) throw new Error(error.message);

  await deleteWorkspaceLogo(workspaceId);
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function ensureDefaultWorkspace(
  userId: string
): Promise<WorkspaceWithRole> {
  const existing = await getDefaultWorkspaceForUser(userId);
  if (existing) return existing;

  const workspace = await createWorkspaceForOwner(userId, "My Workspace", {
    isDefault: true,
  });
  return {
    ...workspace,
    member_role: "owner",
  };
}

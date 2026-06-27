import { auth } from "@clerk/nextjs/server";

import { canCreateSubaccount } from "@/lib/billing/limit-enforcer";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(userId, { request: req });
  const supabase = getSupabaseAdmin();

  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", ctx.workspaceId)
    .in("role", ["member", "admin"]);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const userIds = (members ?? []).map((m) => m.user_id);
  let usersById = new Map<string, Record<string, unknown>>();

  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, is_active")
      .in("id", userIds);

    if (usersError) {
      return Response.json({ error: usersError.message }, { status: 500 });
    }

    usersById = new Map((users ?? []).map((u) => [u.id, u]));
  }

  return Response.json({
    members: (members ?? []).map((m) => ({
      userId: m.user_id,
      role: m.role,
      createdAt: m.created_at,
      user: usersById.get(m.user_id) ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(userId, { request: req });

  if (ctx.memberRole !== "owner" && ctx.memberRole !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; fullName?: string };
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

  const supabase = getSupabaseAdmin();

  const { data: existingUser } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  let memberUserId = existingUser?.id;

  if (!memberUserId) {
    memberUserId = `invite_${crypto.randomUUID()}`;
    const { error: userError } = await supabase.from("users").insert({
      id: memberUserId,
      email,
      full_name: body.fullName?.trim() || email.split("@")[0],
      role: "subaccount",
      parent_user_id: ctx.ownerUserId,
      is_active: false,
    });

    if (userError) {
      return Response.json({ error: userError.message }, { status: 500 });
    }
  } else if (existingUser && existingUser.role !== "subaccount") {
    await supabase
      .from("users")
      .update({ role: "subaccount", parent_user_id: ctx.ownerUserId })
      .eq("id", memberUserId);
  }

  const { error: memberError } = await supabase.from("workspace_members").upsert(
    {
      workspace_id: ctx.workspaceId,
      user_id: memberUserId,
      role: "member",
    },
    { onConflict: "workspace_id,user_id" }
  );

  if (memberError) {
    return Response.json({ error: memberError.message }, { status: 500 });
  }

  return Response.json(
    {
      member: {
        userId: memberUserId,
        email,
        role: "member",
        status: existingUser ? "added" : "invited",
      },
      message:
        "Subaccount added to this workspace. They must sign up with this email via Clerk to access it.",
    },
    { status: 201 }
  );
}

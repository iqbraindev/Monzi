import { auth } from "@clerk/nextjs/server";

import { updateWidgetLayouts } from "@/lib/dashboard/service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";
import {
  assertMemberCanMutate,
  memberAccessDeniedResponse,
} from "@/lib/rbac/member-access";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: dashboardId } = await params;
    const body = (await req.json()) as {
      layouts?: Array<{ id: string; x: number; y: number; w: number; h: number }>;
    };

    if (!body.layouts?.length) {
      return Response.json({ error: "layouts is required" }, { status: 400 });
    }

    for (const item of body.layouts) {
      if (
        !item.id ||
        typeof item.x !== "number" ||
        typeof item.y !== "number" ||
        typeof item.w !== "number" ||
        typeof item.h !== "number"
      ) {
        return Response.json({ error: "Invalid layout item" }, { status: 400 });
      }
    }

    const supabase = getSupabaseAdmin();
    await updateWidgetLayouts(
      supabase,
      ctx.workspaceId,
      dashboardId,
      body.layouts
    );

    return Response.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save layout";
    console.error("[dashboard layout PATCH]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

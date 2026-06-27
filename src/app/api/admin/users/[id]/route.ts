import { requireSuperAdmin } from "@/lib/auth/require-role";
import { updateAdminUser } from "@/lib/admin/users";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const user = await updateAdminUser(auth.userId, id, {
      is_suspended: body.is_suspended,
      suspension_reason: body.suspension_reason,
      is_active: body.is_active,
      pack_id: body.pack_id,
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update user";
    return Response.json({ error: message }, { status: 400 });
  }
}

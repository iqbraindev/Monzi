import { deleteAdminUser } from "@/lib/admin/delete-user";
import { updateAdminUser } from "@/lib/admin/users";
import { requireSuperAdmin } from "@/lib/auth/require-role";

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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const result = await deleteAdminUser(auth.userId, id);
    return Response.json({ success: true, email: result.email });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete user";
    const status =
      message === "User not found"
        ? 404
        : message === "Only suspended users can be deleted" ||
            message === "Super admin accounts cannot be deleted" ||
            message === "You cannot delete your own account"
          ? 400
          : 500;
    return Response.json({ error: message }, { status });
  }
}

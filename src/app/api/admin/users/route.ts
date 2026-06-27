import { requireSuperAdmin } from "@/lib/auth/require-role";
import { listAdminUsers } from "@/lib/admin/users";

export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? undefined;
    const role = searchParams.get("role") ?? undefined;
    const users = await listAdminUsers({ search, role });
    return Response.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load users";
    return Response.json({ error: message }, { status: 500 });
  }
}

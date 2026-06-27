import { auth } from "@clerk/nextjs/server";

import { getClerkUserRole } from "@/lib/auth/super-admin";
import { syncSuperAdminRole } from "@/lib/users/provision";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updated = await syncSuperAdminRole(userId);
  const role = await getClerkUserRole(userId);
  return Response.json({ updated, role });
}

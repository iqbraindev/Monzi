import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { SuperAdminSync } from "@/components/auth/super-admin-sync";
import { getClerkUserRole } from "@/lib/auth/super-admin";
import { syncSuperAdminRole } from "@/lib/users/provision";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await syncSuperAdminRole(userId);

  const role = await getClerkUserRole(userId);
  if (role !== "super_admin") redirect("/dashboard");

  return (
    <>
      <SuperAdminSync />
      <AdminShell>{children}</AdminShell>
    </>
  );
}

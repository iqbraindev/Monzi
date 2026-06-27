import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/aria/app-shell";
import { SuperAdminSync } from "@/components/auth/super-admin-sync";
import { getClerkUserRole } from "@/lib/auth/super-admin";
import { syncSuperAdminRole } from "@/lib/users/provision";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await syncSuperAdminRole(userId);

  const role = await getClerkUserRole(userId);
  if (role === "super_admin") redirect("/admin");

  return (
    <>
      <SuperAdminSync />
      <AppShell>{children}</AppShell>
    </>
  );
}

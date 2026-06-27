"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

/** Refreshes Clerk session after server-side super-admin role sync. */
export function SuperAdminSync() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const synced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || synced.current) return;

    let cancelled = false;

    void (async () => {
      const res = await fetch("/api/user/sync-role");
      if (!res.ok || cancelled) return;

      const data = (await res.json()) as { role?: string };
      if (data.role !== "super_admin" || cancelled) return;

      synced.current = true;
      await user?.reload();

      if (
        !cancelled &&
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/admin")
      ) {
        router.replace("/admin");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, router]);

  return null;
}

"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { adminShellClassName } from "@/components/admin/admin-button-styles";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={adminShellClassName("aria-scope relative flex h-screen w-full flex-col overflow-hidden bg-[#07070b] font-sans text-[15px] text-aria-text antialiased")}>
      <AdminTopbar />

      <div className="relative flex min-h-0 flex-1">
        <AdminSidebar />

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div
              className="aria-mesh-blob"
              style={{
                top: "-20%",
                left: "5%",
                width: "55%",
                height: "70%",
                background:
                  "radial-gradient(circle, rgba(245,158,11,0.08), transparent 65%)",
              }}
            />
            <div
              className="aria-mesh-blob"
              style={{
                bottom: "-25%",
                right: 0,
                width: "55%",
                height: "75%",
                background:
                  "radial-gradient(circle, rgba(124,58,237,0.08), transparent 65%)",
              }}
            />
          </div>

          <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

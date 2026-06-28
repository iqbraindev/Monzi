"use client";

import { Topbar } from "@/components/aria/topbar";
import { Sidebar } from "@/components/aria/sidebar";
import { CommandPalette } from "@/components/aria/command-palette";
import { AgentAssistant } from "@/components/aria/agents/agent-assistant";
import { AgentDashboardBridge } from "@/components/aria/dashboard/agent-dashboard-bridge";
import { AgentInsightBar } from "@/components/aria/agents/agent-insight-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="aria-scope relative flex h-screen w-full flex-col overflow-hidden bg-aria-base font-sans text-[15px] text-aria-text antialiased">
      <AgentDashboardBridge />
      <Topbar />
      <AgentInsightBar />

      <div className="relative flex min-h-0 flex-1">
        <Sidebar />

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Animated mesh-gradient backdrop */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div
              className="aria-mesh-blob"
              style={{
                top: "-20%",
                left: "5%",
                width: "55%",
                height: "70%",
                background:
                  "radial-gradient(circle, rgba(124,58,237,0.16), transparent 65%)",
                animation: "aria-mesh 22s ease-in-out infinite",
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
                  "radial-gradient(circle, rgba(6,182,212,0.12), transparent 65%)",
                animation: "aria-mesh 28s ease-in-out infinite reverse",
              }}
            />
          </div>

          <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-y-auto">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette />
      <AgentAssistant />
    </div>
  );
}

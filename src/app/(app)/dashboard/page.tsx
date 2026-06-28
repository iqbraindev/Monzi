import { DashboardAgentStrip } from "@/components/aria/dashboard/dashboard-agent-strip";
import { DashboardTabs } from "@/components/aria/dashboard/dashboard-tabs";
import { DashboardGrid } from "@/components/aria/dashboard/dashboard-grid";
import { WidgetPicker } from "@/components/aria/dashboard/widget-picker";
import { DashboardProvider } from "@/components/aria/dashboard/dashboard-provider";
import { DashboardEmptyState } from "@/components/aria/dashboard/dashboard-empty-state";
import { CreateDashboardModal } from "@/components/aria/dashboard/create-dashboard-modal";
import { DashboardConnectionBanner } from "@/components/aria/dashboard/dashboard-connection-banner";

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <div className="shrink-0">
        <DashboardAgentStrip />
        <DashboardTabs />
        <DashboardConnectionBanner />
      </div>

      <DashboardEmptyState />
      <DashboardGrid />

      <WidgetPicker />
      <CreateDashboardModal />
    </DashboardProvider>
  );
}

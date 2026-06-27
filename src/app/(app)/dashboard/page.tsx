import { InsightBar } from "@/components/aria/dashboard/insight-bar";
import { DashboardTabs } from "@/components/aria/dashboard/dashboard-tabs";
import { DashboardGrid } from "@/components/aria/dashboard/dashboard-grid";
import { WidgetPicker } from "@/components/aria/dashboard/widget-picker";
import { DashboardProvider } from "@/components/aria/dashboard/dashboard-provider";
import { DashboardEmptyState } from "@/components/aria/dashboard/dashboard-empty-state";
import { CreateDashboardModal } from "@/components/aria/dashboard/create-dashboard-modal";

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <div className="shrink-0">
        <InsightBar />
        <DashboardTabs />
      </div>

      <DashboardEmptyState />
      <DashboardGrid />

      <WidgetPicker />
      <CreateDashboardModal />
    </DashboardProvider>
  );
}

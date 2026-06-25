import { InsightBar } from "@/components/aria/dashboard/insight-bar";
import { DashboardTabs } from "@/components/aria/dashboard/dashboard-tabs";
import { DashboardGrid } from "@/components/aria/dashboard/dashboard-grid";
import { WidgetPicker } from "@/components/aria/dashboard/widget-picker";
import { DashboardProvider } from "@/components/aria/dashboard/dashboard-provider";

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <div className="shrink-0">
        <InsightBar />
        <DashboardTabs />
      </div>

      <DashboardGrid />

      <WidgetPicker />
    </DashboardProvider>
  );
}

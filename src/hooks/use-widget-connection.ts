"use client";

import { integrationFromToolkitSlug } from "@/lib/composio/toolkits";
import type { WidgetType } from "@/lib/dashboard/types";
import { WIDGET_TOOLKIT } from "@/lib/dashboard/widget-registry";
import { useConnectedToolkits } from "@/hooks/use-composio-connections";

export function useWidgetConnection(widgetType: WidgetType) {
  const toolkit = WIDGET_TOOLKIT[widgetType];
  const { toolkits, isLoading } = useConnectedToolkits();

  const connected = !toolkit || toolkits.has(toolkit);
  const app = toolkit ? integrationFromToolkitSlug(toolkit) : null;

  return {
    toolkit,
    connected,
    isLoading: Boolean(toolkit) && isLoading,
    appName: app?.name ?? toolkit ?? "",
  };
}

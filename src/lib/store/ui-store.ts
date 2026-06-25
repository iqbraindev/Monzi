import { create } from "zustand";

import { writeStoredActiveAgentId } from "@/lib/store/active-agent";

interface UIState {
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  agentPanelOpen: boolean;
  activeAgentId: string | null;
  toggleSidebar: () => void;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;
  setAgentPanelOpen: (open: boolean) => void;
  toggleAgentPanel: () => void;
  setActiveAgent: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  commandOpen: false,
  agentPanelOpen: false,
  activeAgentId: null,
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCommandOpen: (open) => set({ commandOpen: open }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  setAgentPanelOpen: (open) => set({ agentPanelOpen: open }),
  toggleAgentPanel: () => set((s) => ({ agentPanelOpen: !s.agentPanelOpen })),
  setActiveAgent: (id) => {
    writeStoredActiveAgentId(id);
    set({ activeAgentId: id });
  },
}));

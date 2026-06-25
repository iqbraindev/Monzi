"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { ArrowRight, Plus, Search } from "lucide-react";

import { useUIStore } from "@/lib/store/ui-store";
import { AgentOrb } from "@/components/aria/agent-orb";

interface CommandAction {
  icon: string;
  label: string;
  message?: string;
  run?: () => void;
}

const DASHBOARD_COMMAND_MESSAGES: Record<string, string> = {
  "Show my emails": "Show my unread emails on the dashboard",
  "Show tasks due today": "Add a tasks widget showing what's due today",
  "Show overdue invoices": "Show overdue invoices on my dashboard",
  "Build a meeting prep view":
    "Build a meeting prep dashboard with calendar, emails, and tasks",
};

export function CommandPalette() {
  const router = useRouter();
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const toggle = useUIStore((s) => s.toggleCommand);
  const [query, setQuery] = useState("");
  const [defaultAgentId, setDefaultAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("Monzi");
  const [agentColor, setAgentColor] = useState("#7C3AED");

  useEffect(() => {
    if (!open) return;
    void fetch("/api/agents/default")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { agentId?: string; agent?: { name: string; color: string } } | null) => {
        if (data?.agentId) setDefaultAgentId(data.agentId);
        if (data?.agent?.name) setAgentName(data.agent.name);
        if (data?.agent?.color) setAgentColor(data.agent.color);
      })
      .catch(() => undefined);
  }, [open]);

  const close = useCallback(() => {
    setQuery("");
    setOpen(false);
  }, [setOpen]);

  const askAgent = useCallback(
    (message: string) => {
      close();
      if (defaultAgentId) {
        router.push(
          `/agents/${defaultAgentId}?send=${encodeURIComponent(message)}`
        );
      } else {
        router.push("/agents");
      }
    },
    [close, defaultAgentId, router]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, close]);

  if (!open) return null;

  const go = (href: string) => () => {
    close();
    router.push(href);
  };

  const groups: { title: string; items: CommandAction[] }[] = [
    {
      title: "Dashboard Actions",
      items: [
        { icon: "📊", label: "Show my emails", message: DASHBOARD_COMMAND_MESSAGES["Show my emails"] },
        { icon: "✅", label: "Show tasks due today", message: DASHBOARD_COMMAND_MESSAGES["Show tasks due today"] },
        { icon: "💰", label: "Show overdue invoices", message: DASHBOARD_COMMAND_MESSAGES["Show overdue invoices"] },
        { icon: "📅", label: "Build a meeting prep view", message: DASHBOARD_COMMAND_MESSAGES["Build a meeting prep view"] },
      ],
    },
    {
      title: "Navigate",
      items: [
        { icon: "→", label: "Go to Dashboard", run: go("/dashboard") },
        { icon: "→", label: "Go to Agents", run: go("/agents") },
        { icon: "→", label: "Go to Billing", run: go("/billing") },
      ],
    },
    {
      title: "Quick Create",
      items: [
        { icon: "+", label: "Create new agent", run: go("/agents?create=1") },
        { icon: "+", label: "Add widget to dashboard", run: go("/dashboard") },
        { icon: "+", label: "Connect an app", run: go("/integrations") },
      ],
    },
  ];

  return (
    <div
      onClick={close}
      className="aria-pop fixed inset-0 z-[60] flex items-start justify-center bg-black/70 pt-[14vh] backdrop-blur-[6px]"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[640px] px-4">
        <Command
          label="Command palette"
          className="aria-glow-pulse overflow-hidden rounded-[18px] border border-aria-border bg-aria-elevated/95"
        >
          <div className="flex items-center gap-3 border-b border-aria-border px-[18px] py-4">
            <AgentOrb color={agentColor} size={26} />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={`Ask ${agentName} or search...`}
              className="flex-1 bg-transparent text-base text-aria-text outline-none placeholder:text-aria-text-muted"
            />
            <span className="rounded-[5px] border border-aria-border px-1.5 py-0.5 font-mono text-[11px] text-aria-text-muted">
              ESC
            </span>
          </div>

          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-aria-text-secondary">
              No results found.
            </Command.Empty>

            {query.trim() && (
              <Command.Item
                value={`ask ${query}`}
                onSelect={() => askAgent(query.trim())}
                className="mb-1.5 flex w-full cursor-pointer items-center gap-3 rounded-[11px] bg-aria-primary/15 p-3 text-left data-[selected=true]:bg-aria-primary/25"
              >
                <AgentOrb color={agentColor} size={30} />
                <span className="flex-1 text-sm text-aria-text">
                  Ask {agentName}:{" "}
                  <strong className="font-semibold text-aria-primary-light">
                    &ldquo;{query}&rdquo;
                  </strong>
                </span>
                <ArrowRight className="size-4 text-aria-primary-light" />
              </Command.Item>
            )}

            {groups.map((group) => (
              <Command.Group
                key={group.title}
                heading={group.title}
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-aria-text-muted [&_[cmdk-group-heading]]:uppercase"
              >
                {group.items.map((item) => (
                  <Command.Item
                    key={item.label}
                    onSelect={() => {
                      if (item.run) item.run();
                      else if (item.message) askAgent(item.message);
                      else close();
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm text-aria-text transition-colors data-[selected=true]:bg-aria-subtle"
                  >
                    <span className="flex w-[22px] justify-center text-base">
                      {item.icon === "→" ? (
                        <ArrowRight className="size-4 text-aria-text-secondary" />
                      ) : item.icon === "+" ? (
                        <Plus className="size-4 text-aria-text-secondary" />
                      ) : (
                        item.icon
                      )}
                    </span>
                    <span className="flex-1">{item.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          <div className="flex items-center gap-4 border-t border-aria-border px-[18px] py-2.5 font-mono text-[11px] text-aria-text-muted">
            <span className="flex items-center gap-1">
              <Search className="size-3" /> search
            </span>
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>ESC close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

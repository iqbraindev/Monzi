"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Blocks,
  Users,
  CreditCard,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { useLimits } from "@/hooks/use-workspaces";
import { useBilling } from "@/hooks/use-billing";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui-store";
import { getAgent } from "@/lib/aria/mock-data";
import { AgentAvatar } from "@/components/aria/agent-avatar";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_MAIN: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Integrations", href: "/integrations", icon: Blocks },
];

const NAV_MANAGE: NavItem[] = [
  { label: "Subaccounts", href: "/subaccounts", icon: Users },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
];

function NavLink({
  item,
  expanded,
  active,
}: {
  item: NavItem;
  expanded: boolean;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        "flex h-10 items-center gap-3 rounded-[10px] border-l-2 px-3 text-sm transition-all",
        active
          ? "border-aria-primary bg-aria-primary/15 font-semibold text-aria-primary-light"
          : "border-transparent font-medium text-aria-text-secondary hover:bg-aria-elevated hover:text-aria-text"
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {expanded && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarUsageMeter({ expanded }: { expanded: boolean }) {
  const { data: limitsData } = useLimits();
  const { data: billing } = useBilling();

  if (!expanded) return null;

  const planName = billing?.pack?.name ?? "Free";
  const used = limitsData?.usage?.ai_messages_used ?? 0;
  const max = limitsData?.limits?.ai_messages_per_month ?? 50;
  const unlimited = max < 0;
  const percent = unlimited || max === 0 ? 0 : Math.min(100, (used / max) * 100);

  return (
    <div className="mt-2 flex flex-col gap-2 p-2.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-aria-primary/30 bg-aria-primary/15 px-2.5 py-0.5 text-xs font-semibold text-aria-primary-light">
          {planName} Plan
        </span>
        <span className="font-mono text-[11px] text-aria-text-secondary">
          {unlimited
            ? `${used.toLocaleString()} msgs`
            : `${used.toLocaleString()} / ${max.toLocaleString()}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-[5px] overflow-hidden rounded-full bg-aria-subtle">
          <div
            className="aria-gradient h-full rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const activeAgentId = useUIStore((s) => s.activeAgentId);
  const expanded = !collapsed;
  const agent = getAgent(activeAgentId ?? "nova");

  return (
    <aside
      className="flex shrink-0 flex-col overflow-hidden border-r border-aria-border-subtle bg-aria-surface transition-[width] duration-200 ease-out"
      style={{ width: collapsed ? 68 : 240 }}
    >
      <WorkspaceSwitcher expanded={expanded} />

      <nav className="flex flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto p-2">
        {NAV_MAIN.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            expanded={expanded}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}

        {expanded && (
          <div className="px-3 pt-3.5 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-aria-text-muted uppercase">
            Manage
          </div>
        )}
        {NAV_MANAGE.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            expanded={expanded}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </nav>

      <div className="border-t border-aria-border-subtle p-2">
        {expanded && (
          <div className="flex flex-col gap-2.5 rounded-xl border border-aria-border bg-aria-elevated p-2.5">
            <div className="flex items-center gap-2.5">
              <AgentAvatar
                assetId={agent.avatarAssetId}
                color={agent.color}
                size={34}
                breathe
                alt={agent.name}
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold text-aria-text">
                  {agent.name}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-aria-text-secondary">
                  <span className="size-1.5 rounded-full bg-aria-success" />
                  Active · Ready
                </span>
              </span>
            </div>
            <button className="h-[34px] w-full rounded-[9px] bg-aria-primary/15 text-[13px] font-semibold text-aria-primary-light transition-colors hover:bg-aria-primary/30">
              Chat with {agent.name}
            </button>
          </div>
        )}

        <SidebarUsageMeter expanded={expanded} />
      </div>
    </aside>
  );
}

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
import { SidebarUsageMeter } from "@/components/aria/sidebar-usage-meter";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui-store";

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

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const expanded = !collapsed;

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
        <SidebarUsageMeter expanded={expanded} />
      </div>
    </aside>
  );
}

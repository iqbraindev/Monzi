"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  Activity,
  ScrollText,
  Plug,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import { MonziLogo, MONZI_LOGO_APP_STYLE } from "@/components/brand/monzi-logo";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui-store";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const ADMIN_NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Packages", href: "/admin/packs", icon: Package },
  { label: "Billing", href: "/admin/billing", icon: CreditCard },
  { label: "Usage", href: "/admin/usage", icon: Activity },
  { label: "Integrations", href: "/admin/integrations", icon: Plug },
  { label: "Composio Apps", href: "/admin/apps", icon: Smartphone },
  { label: "Audit log", href: "/admin/audit", icon: ScrollText },
];

function NavLink({
  item,
  expanded,
  active,
  onNavigate,
}: {
  item: NavItem;
  expanded: boolean;
  active: boolean;
  onNavigate: (href: string) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      title={item.label}
      onClick={() => onNavigate(item.href)}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-[10px] border-l-2 px-3 text-left text-sm transition-all",
        active
          ? "border-amber-400 bg-amber-400/10 font-semibold text-amber-300"
          : "border-transparent font-medium text-aria-text-secondary hover:bg-aria-elevated hover:text-aria-text"
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {expanded && <span className="truncate">{item.label}</span>}
    </button>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const expanded = !collapsed;

  function navigate(href: string) {
    if (pathname !== href) {
      router.push(href);
    }
  }

  return (
    <aside
      className="relative z-20 flex shrink-0 flex-col overflow-hidden border-r border-amber-500/15 bg-[#0c0c12] transition-[width] duration-200 ease-out"
      style={{ width: collapsed ? 68 : 240 }}
    >
      <div
        className={cn(
          "flex min-h-[54px] items-center gap-2.5 px-3.5 pt-4 pb-2.5",
          !expanded && "justify-center px-2"
        )}
      >
        <MonziLogo
          href="/admin"
          style={expanded ? MONZI_LOGO_APP_STYLE : { width: "auto", height: 24 }}
          className={cn("shrink-0", !expanded && "max-w-[44px]")}
        />
        {expanded && (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-semibold text-aria-text">
              Admin
            </span>
            <span className="truncate text-[11px] text-amber-400/80">
              Super Admin Console
            </span>
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto p-2">
        {ADMIN_NAV.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <NavLink
              key={item.href}
              item={item}
              expanded={expanded}
              active={active}
              onNavigate={navigate}
            />
          );
        })}
      </nav>
    </aside>
  );
}

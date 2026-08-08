"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Tags,
  Truck,
  Warehouse,
  ShoppingCart,
  Users,
  FileText,
  Bell,
  Settings,
  ClipboardList,
  ScrollText,
  UserCog,
  X,
  PackagePlus,
  ArrowLeftRight,
  Tag,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, canAccessNav } from "@/lib/permissions";
import type { Role } from "@/app/generated/prisma";

const ICONS = {
  dashboard: LayoutDashboard,
  products: Package,
  brands: Tag,
  categories: Tags,
  warehouses: Building2,
  suppliers: Truck,
  inventory: Warehouse,
  "purchase-orders": ClipboardList,
  sales: ShoppingCart,
  customers: Users,
  employees: UserCog,
  reports: FileText,
  notifications: Bell,
  "audit-logs": ScrollText,
  settings: Settings,
  "stock-requests": PackagePlus,
  "stock-transfers": ArrowLeftRight,
};

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "SALES_MANAGER") as Role;

  const forcePasswordChange = session?.user?.forcePasswordChange;
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (forcePasswordChange) {
      return item.permission === "settings";
    }
    return canAccessNav(role, item.permission);
  });

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary">
            <Package className="h-6 w-6" />
            SIMS
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {visibleItems.map((item) => {
            const Icon = ICONS[item.permission as keyof typeof ICONS] ?? LayoutDashboard;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

import { Role } from "@/app/generated/prisma";

export const ROUTE_PERMISSIONS: Record<string, Role[] | "all"> = {
  "/dashboard": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER", "SALES_STAFF"],
  "/dashboard/products": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER", "SALES_STAFF"],
  "/dashboard/categories": ["SUPER_ADMIN", "INVENTORY_MANAGER"],
  "/dashboard/suppliers": ["SUPER_ADMIN", "INVENTORY_MANAGER"],
  "/dashboard/inventory": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"],
  "/dashboard/purchase-orders": ["SUPER_ADMIN", "INVENTORY_MANAGER"],
  "/dashboard/sales": ["SUPER_ADMIN", "STORE_MANAGER", "SALES_STAFF"],
  "/dashboard/customers": ["SUPER_ADMIN", "STORE_MANAGER", "SALES_STAFF"],
  "/dashboard/reports": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"],
  "/dashboard/notifications": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER", "SALES_STAFF"],
  "/dashboard/audit-logs": ["SUPER_ADMIN", "INVENTORY_MANAGER"],
  "/dashboard/settings": "all",
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", permission: "dashboard" },
  { href: "/dashboard/products", label: "Products", permission: "products" },
  { href: "/dashboard/categories", label: "Categories", permission: "categories" },
  { href: "/dashboard/suppliers", label: "Suppliers", permission: "suppliers" },
  { href: "/dashboard/inventory", label: "Inventory", permission: "inventory" },
  { href: "/dashboard/purchase-orders", label: "Purchase Orders", permission: "purchase-orders" },
  { href: "/dashboard/sales", label: "Sales", permission: "sales" },
  { href: "/dashboard/customers", label: "Customers", permission: "customers" },
  { href: "/dashboard/reports", label: "Reports", permission: "reports" },
  { href: "/dashboard/notifications", label: "Notifications", permission: "notifications" },
  { href: "/dashboard/audit-logs", label: "Audit Logs", permission: "audit-logs" },
  { href: "/dashboard/settings", label: "Settings", permission: "settings" },
] as const;

export function canAccessRoute(role: Role, pathname: string): boolean {
  const matched = Object.keys(ROUTE_PERMISSIONS)
    .filter((route) => pathname === route || (route !== "/dashboard" && pathname.startsWith(route)))
    .sort((a, b) => b.length - a.length)[0];

  if (!matched) return true;
  const allowed = ROUTE_PERMISSIONS[matched];
  if (allowed === "all") return true;
  return allowed.includes(role);
}

export function canAccessNav(role: Role, permission: string): boolean {
  if (role === "SUPER_ADMIN") return true;
  const perms: Record<Role, string[]> = {
    SUPER_ADMIN: ["*"],
    INVENTORY_MANAGER: ["dashboard", "products", "categories", "suppliers", "inventory", "purchase-orders", "reports", "notifications", "audit-logs", "settings"],
    STORE_MANAGER: ["dashboard", "products", "inventory", "sales", "customers", "reports", "notifications", "settings"],
    SALES_STAFF: ["dashboard", "products", "sales", "customers", "notifications", "settings"],
  };
  return perms[role].includes(permission);
}

import { Role } from "@/app/generated/prisma";

export const ROUTE_PERMISSIONS: Record<string, Role[] | "all"> = {
  "/dashboard": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER", "SALES_MANAGER"],
  "/dashboard/products": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER", "SALES_MANAGER"],
  "/dashboard/brands": ["SUPER_ADMIN", "INVENTORY_MANAGER"],
  "/dashboard/categories": ["SUPER_ADMIN", "INVENTORY_MANAGER"],
  "/dashboard/warehouses": ["SUPER_ADMIN", "INVENTORY_MANAGER"],
  "/dashboard/suppliers": ["SUPER_ADMIN", "INVENTORY_MANAGER"],
  "/dashboard/inventory": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER", "SALES_MANAGER"],
  "/dashboard/purchase-orders": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"],
  "/dashboard/sales": ["SUPER_ADMIN", "STORE_MANAGER", "SALES_MANAGER"],
  "/dashboard/orders": ["SUPER_ADMIN", "STORE_MANAGER", "SALES_MANAGER"],
  "/dashboard/invoices": ["SUPER_ADMIN", "STORE_MANAGER", "SALES_MANAGER"],
  "/dashboard/customers": ["SUPER_ADMIN", "STORE_MANAGER", "SALES_MANAGER"],
  "/dashboard/stock-requests": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"],
  "/dashboard/stock-transfers": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"],
  "/dashboard/stock-take": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"],
  "/dashboard/employees": ["SUPER_ADMIN"],
  "/dashboard/reports": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER", "SALES_MANAGER"],
  "/dashboard/notifications": ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER", "SALES_MANAGER"],
  "/dashboard/audit-logs": ["SUPER_ADMIN"],
  "/dashboard/settings": "all",
};

export interface NavSubItem {
  href: string;
  label: string;
}

export interface NavItemDef {
  href: string;
  label: string;
  permission: string;
  iconKey?: string;
  children?: NavSubItem[];
}

export const NAV_ITEMS: NavItemDef[] = [
  { href: "/dashboard", label: "Dashboard", permission: "dashboard" },
  { href: "/dashboard/sales", label: "Sales", permission: "sales" },
  { href: "/dashboard/orders", label: "Orders", permission: "orders" },
  { href: "/dashboard/customers", label: "Customers", permission: "customers" },
  { href: "/dashboard/products", label: "Products", permission: "products" },
  { href: "/dashboard/inventory", label: "Stock Availability", permission: "inventory" },
  { href: "/dashboard/invoices", label: "Invoices", permission: "invoices" },
  { href: "/dashboard/reports", label: "Reports", permission: "reports" },
  { href: "/dashboard/brands", label: "Brands", permission: "brands" },
  { href: "/dashboard/categories", label: "Categories", permission: "categories" },
  { href: "/dashboard/warehouses", label: "Warehouses", permission: "warehouses" },
  { href: "/dashboard/suppliers", label: "Suppliers", permission: "suppliers" },
  { href: "/dashboard/purchase-orders", label: "Purchase Orders", permission: "purchase-orders" },
  { href: "/dashboard/stock-requests", label: "Stock Requests", permission: "stock-requests" },
  { href: "/dashboard/stock-transfers", label: "Stock Transfers", permission: "stock-transfers" },
  { href: "/dashboard/stock-take", label: "Stock Take / Audit", permission: "stock-take" },
  { href: "/dashboard/employees", label: "Employee Management", permission: "employees" },
  { href: "/dashboard/notifications", label: "Notifications", permission: "notifications" },
  { href: "/dashboard/audit-logs", label: "Audit Logs", permission: "audit-logs" },
  { href: "/dashboard/settings", label: "Settings", permission: "settings" },
];

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
    INVENTORY_MANAGER: [
      "dashboard", "products", "brands", "categories", "warehouses", "suppliers",
      "inventory", "purchase-orders", "stock-requests", "stock-transfers",
      "stock-take", "reports", "notifications", "settings"
    ],
    STORE_MANAGER: [
      "dashboard", "products", "inventory", "purchase-orders", "sales", "orders",
      "invoices", "customers", "reports", "notifications", "settings",
      "stock-requests", "stock-transfers", "stock-take"
    ],
    SALES_MANAGER: [
      "dashboard", "products", "inventory", "sales", "orders", "invoices",
      "customers", "reports", "notifications", "settings"
    ],
  };
  return perms[role]?.includes(permission) ?? false;
}

export function canWriteProducts(role: Role): boolean {
  return ["SUPER_ADMIN", "INVENTORY_MANAGER"].includes(role);
}

export function canWriteInventory(role: Role): boolean {
  return ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"].includes(role);
}

export function canManageCompanySettings(role: Role): boolean {
  return role === "SUPER_ADMIN";
}

export function canManageEmployees(role: Role): boolean {
  return role === "SUPER_ADMIN";
}

export function canDeleteAuditLogs(role: Role): boolean {
  return role === "SUPER_ADMIN";
}


import type { Role, ProductStatus, PurchaseOrderStatus, SaleStatus, TransactionType, NotificationType, UserStatus, CustomerStatus } from "@/app/generated/prisma/enums";

export type { Role, ProductStatus, PurchaseOrderStatus, SaleStatus, TransactionType, NotificationType, UserStatus, CustomerStatus };

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  totalSales: number;
  revenue: number;
  lowStock: number;
}

export interface SalesManagerStats {
  todaySales: number;
  todayRevenue: number;
  monthSales: number;
  monthRevenue: number;
  totalCustomers: number;
  pendingOrders: number;
  returnedSales: number;
  averageOrderValue: number;
}

export interface EmployeeStats {
  totalEmployees: number;
  superAdmins: number;
  storeManagers: number;
  inventoryManagers: number;
  salesManagers: number;
  activeEmployees: number;
  inactiveEmployees: number;
}

export interface ChartData {
  name: string;
  value: number;
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  INVENTORY_MANAGER: "Inventory Manager",
  STORE_MANAGER: "Store Manager",
  SALES_MANAGER: "Sales Manager",
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ["*"],
  INVENTORY_MANAGER: ["products", "categories", "suppliers", "inventory", "purchase-orders", "reports"],
  STORE_MANAGER: ["products", "inventory", "sales", "customers", "reports"],
  SALES_MANAGER: ["sales", "customers", "products:read", "inventory:read", "reports:own"],
};

export function hasPermission(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.includes("*")) return true;
  return perms.some((p) => p === permission || p.startsWith(permission.split(":")[0]));
}

export function isReadOnlyRole(role: Role, module: string): boolean {
  if (role === "SALES_MANAGER") {
    return ["products", "inventory"].includes(module);
  }
  return false;
}

import { Role, ProductStatus, PurchaseOrderStatus, SaleStatus, TransactionType, NotificationType } from "@/app/generated/prisma";

export type { Role, ProductStatus, PurchaseOrderStatus, SaleStatus, TransactionType, NotificationType };

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

export interface ChartData {
  name: string;
  value: number;
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  INVENTORY_MANAGER: "Inventory Manager",
  STORE_MANAGER: "Store Manager",
  SALES_STAFF: "Sales Staff",
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ["*"],
  INVENTORY_MANAGER: ["products", "categories", "suppliers", "inventory", "purchase-orders", "reports"],
  STORE_MANAGER: ["products", "inventory", "sales", "customers", "reports"],
  SALES_STAFF: ["sales", "customers", "products:read"],
};

export function hasPermission(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.includes("*")) return true;
  return perms.some((p) => p === permission || p.startsWith(permission.split(":")[0]));
}

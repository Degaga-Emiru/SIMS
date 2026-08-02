import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const [totalEmployees, superAdmins, storeManagers, inventoryManagers, salesManagers, activeEmployees, inactiveEmployees] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
      prisma.user.count({ where: { role: "STORE_MANAGER" } }),
      prisma.user.count({ where: { role: "INVENTORY_MANAGER" } }),
      prisma.user.count({ where: { role: "SALES_MANAGER" } }),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "INACTIVE" } }),
    ]);

  const recentActivity = await prisma.auditLog.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return successResponse({
    totalEmployees,
    superAdmins,
    storeManagers,
    inventoryManagers,
    salesManagers,
    activeEmployees,
    inactiveEmployees,
    recentActivity,
  });
}

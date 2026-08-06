import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { apiCache } from "@/lib/cache";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session!.user.role !== "SALES_MANAGER") {
    return errorResponse("Not authorized", 403);
  }

  const userId = session!.user.id;
  const cacheKey = `dashboard:sales-manager:${userId}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return successResponse(cached);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const [
      todaySales,
      todayRevenue,
      monthSales,
      monthRevenue,
      totalCustomers,
      pendingOrders,
      returnedSales,
      recentSales,
      dailySales,
      topProducts,
      salesByCategory,
    ] = await Promise.all([
      prisma.sale.count({ where: { userId, status: "COMPLETED", createdAt: { gte: startOfDay } } }),
      prisma.sale.aggregate({
        where: { userId, status: "COMPLETED", createdAt: { gte: startOfDay } },
        _sum: { totalAmount: true },
      }),
      prisma.sale.count({ where: { userId, status: "COMPLETED", createdAt: { gte: startOfMonth } } }),
      prisma.sale.aggregate({
        where: { userId, status: "COMPLETED", createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.customer.count({ where: { createdById: userId } }),
      prisma.sale.count({ where: { userId, status: "PENDING" } }),
      prisma.sale.count({ where: { userId, status: "REFUNDED" } }),
      prisma.sale.findMany({
        where: { userId },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { customer: true, payments: true },
      }),
      prisma.sale.findMany({
        where: { userId, status: "COMPLETED", createdAt: { gte: sevenDaysAgo } },
        select: { totalAmount: true, createdAt: true },
      }),
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: { sale: { userId, status: "COMPLETED" } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.saleItem.findMany({
        where: { sale: { userId, status: "COMPLETED" } },
        include: { product: { include: { category: true } } },
      }),
    ]);

    const todayRev = Number(todayRevenue._sum.totalAmount ?? 0);
    const monthRev = Number(monthRevenue._sum.totalAmount ?? 0);
    const avgOrder = monthSales > 0 ? monthRev / monthSales : 0;

    const dayMap = new Map<string, number>();
    dailySales.forEach((s) => {
      const key = s.createdAt.toLocaleDateString("en-US", { weekday: "short" });
      dayMap.set(key, (dayMap.get(key) ?? 0) + Number(s.totalAmount));
    });

    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const topSellingProducts = topProducts.map((tp) => ({
      name: products.find((p) => p.id === tp.productId)?.name ?? "Unknown",
      value: tp._sum.quantity ?? 0,
    }));

    const catMap = new Map<string, number>();
    salesByCategory.forEach((si) => {
      const cat = si.product.category.name;
      catMap.set(cat, (catMap.get(cat) ?? 0) + si.quantity);
    });

    const responseData = {
      stats: {
        todaySales,
        todayRevenue: todayRev,
        monthSales,
        monthRevenue: monthRev,
        totalCustomers,
        pendingOrders,
        returnedSales,
        averageOrderValue: avgOrder,
      },
      dailySales: Array.from(dayMap.entries()).map(([name, value]) => ({ name, value })),
      topSellingProducts,
      salesByCategory: Array.from(catMap.entries()).map(([name, value]) => ({ name, value })),
      recentSales,
    };

    apiCache.set(cacheKey, responseData, 5000); // cache for 5 seconds

    return successResponse(responseData);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to fetch stats");
  }
}

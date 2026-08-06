import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { formatDate } from "@/lib/utils";
import { apiCache } from "@/lib/cache";

function buildLastNDaysLabels(days: number, baseDate: Date) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - (days - 1 - index));
    return {
      name: date.toLocaleDateString("en-US", { weekday: "short" }),
      value: 0,
    };
  });
}

function buildLastNMonthsLabels(months: number, baseDate: Date) {
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(baseDate);
    date.setMonth(baseDate.getMonth() - (months - 1 - index));
    return {
      name: date.toLocaleDateString("en-US", { month: "short" }),
      value: 0,
    };
  });
}

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session!.user.role !== "STORE_MANAGER") {
    return errorResponse("Not authorized", 403);
  }

  const cacheKey = `dashboard:store-manager:${session!.user.id}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return successResponse(cached);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  try {
    const [
      totalProducts,
      stockSummary,
      lowStockResult,
      outOfStockResult,
      todaySalesCount,
      todaySalesRevenueResult,
      todayOrders,
      recentTransactions,
      salesByDay,
      salesByMonth,
      topProducts,
      notifications,
      auditLogs,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.aggregate({ _sum: { stockQuantity: true } }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::int as count FROM "Product"
        WHERE "stockQuantity" > 0 AND "stockQuantity" <= "lowStockThreshold"
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::int as count FROM "Product"
        WHERE "stockQuantity" = 0
      `,
      prisma.sale.count({
        where: {
          status: "COMPLETED",
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.sale.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: { gte: startOfDay },
        },
        _sum: { totalAmount: true },
      }),
      prisma.sale.count({
        where: {
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.inventoryTransaction.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        include: { product: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.sale.findMany({
        where: {
          status: "COMPLETED",
          createdAt: { gte: sevenDaysAgo },
        },
        select: { totalAmount: true, createdAt: true },
      }),
      prisma.sale.findMany({
        where: {
          status: "COMPLETED",
          createdAt: { gte: sixMonthsAgo },
        },
        select: { totalAmount: true, createdAt: true },
      }),
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: {
          sale: {
            status: "COMPLETED",
            createdAt: { gte: thirtyDaysAgo },
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.notification.findMany({
        where: { userId: session!.user.id, createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.auditLog.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const currentStoreStock = Number(stockSummary._sum.stockQuantity ?? 0);
    const lowStockItems = Number(lowStockResult[0]?.count ?? 0);
    const outOfStockItems = Number(outOfStockResult[0]?.count ?? 0);
    const todaySalesRevenue = Number(todaySalesRevenueResult._sum.totalAmount ?? 0);

    const dailySalesMap = new Map(buildLastNDaysLabels(7, now).map((entry) => [entry.name, entry.value]));
    salesByDay.forEach((sale) => {
      const key = sale.createdAt.toLocaleDateString("en-US", { weekday: "short" });
      dailySalesMap.set(key, (dailySalesMap.get(key) ?? 0) + Number(sale.totalAmount));
    });

    const monthlySalesMap = new Map(buildLastNMonthsLabels(6, now).map((entry) => [entry.name, entry.value]));
    salesByMonth.forEach((sale) => {
      const key = sale.createdAt.toLocaleDateString("en-US", { month: "short" });
      monthlySalesMap.set(key, (monthlySalesMap.get(key) ?? 0) + Number(sale.totalAmount));
    });

    const [inStockSample, lowStockSample, outOfStockSample] = await Promise.all([
      prisma.$queryRaw<Array<{ name: string }>>`SELECT name FROM "Product" WHERE "stockQuantity" > "lowStockThreshold" LIMIT 3`,
      prisma.$queryRaw<Array<{ name: string }>>`SELECT name FROM "Product" WHERE "stockQuantity" > 0 AND "stockQuantity" <= "lowStockThreshold" LIMIT 3`,
      prisma.$queryRaw<Array<{ name: string }>>`SELECT name FROM "Product" WHERE "stockQuantity" = 0 LIMIT 3`
    ]);

    const inventoryStatus = [
      { name: "In Stock", value: Math.max(totalProducts - lowStockItems - outOfStockItems, 0), color: "#16a34a", products: inStockSample.map(p => p.name) },
      { name: "Low Stock", value: lowStockItems, color: "#f59e0b", products: lowStockSample.map(p => p.name) },
      { name: "Out of Stock", value: outOfStockItems, color: "#ef4444", products: outOfStockSample.map(p => p.name) },
    ];

    const movementMap = new Map<string, { incoming: number; outgoing: number }>();
    recentTransactions.forEach((transaction) => {
      const existing = movementMap.get(transaction.product.name) ?? { incoming: 0, outgoing: 0 };
      if (transaction.type === "STOCK_IN") {
        existing.incoming += transaction.quantity;
      } else if (transaction.type === "STOCK_OUT") {
        existing.outgoing += transaction.quantity;
      }
      movementMap.set(transaction.product.name, existing);
    });

    const stockMovement = Array.from(movementMap.entries())
      .map(([name, values]) => ({ name, incoming: values.incoming, outgoing: values.outgoing }))
      .sort((a, b) => b.incoming + b.outgoing - (a.incoming + a.outgoing))
      .slice(0, 5);

    const productIds = topProducts.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const topSellingProducts = topProducts.map((item) => ({
      name: products.find((product) => product.id === item.productId)?.name ?? "Unknown",
      value: item._sum.quantity ?? 0,
    }));

    const lowStockCategoryRows = await prisma.$queryRaw<Array<{ categoryName: string; count: bigint }>>`
      SELECT c."name" as "categoryName", COUNT(*)::int as count
      FROM "Product" p
      JOIN "Category" c ON c."id" = p."categoryId"
      WHERE p."stockQuantity" > 0 AND p."stockQuantity" <= p."lowStockThreshold"
      GROUP BY c."name"
      ORDER BY count DESC
      LIMIT 4
    `;

    const lowStockCategories = lowStockCategoryRows.map((row, index) => ({
      name: row.categoryName,
      value: Number(row.count),
      color: ["#16a34a", "#3b82f6", "#f59e0b", "#ef4444"][index % 4],
    }));

    const weeklyOrdersMap = new Map(buildLastNDaysLabels(7, now).map((entry) => [entry.name, entry.value]));
    const weeklyOrdersData = await prisma.sale.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true },
    });
    weeklyOrdersData.forEach((sale) => {
      const key = sale.createdAt.toLocaleDateString("en-US", { weekday: "short" });
      weeklyOrdersMap.set(key, (weeklyOrdersMap.get(key) ?? 0) + 1);
    });

    const stockRequestStatus = [
      { name: "Pending", value: notifications.filter((note) => note.type === "WARNING").length, color: "#f59e0b" },
      { name: "Approved", value: notifications.filter((note) => note.type === "SUCCESS").length, color: "#16a34a" },
      { name: "Rejected", value: notifications.filter((note) => note.type === "LOW_STOCK").length, color: "#ef4444" },
      { name: "Completed", value: notifications.filter((note) => note.type === "INFO").length, color: "#3b82f6" },
    ];

    const lowStockProducts = await prisma.product.findMany({
      where: {
        stockQuantity: { gt: 0 },
      },
      select: {
        name: true,
        stockQuantity: true,
        lowStockThreshold: true,
      },
      orderBy: { stockQuantity: "asc" },
      take: 5,
    });

    const recentStockRequests = recentTransactions.slice(0, 3).map((transaction, index) => ({
      id: `TR-${String(index + 1).padStart(3, "0")}`,
      product: transaction.product.name,
      quantity: transaction.quantity,
      status: transaction.type === "STOCK_IN" ? "Received" : "Processed",
      date: formatDate(transaction.createdAt),
    }));

    const mappedLowStockProducts = lowStockProducts
      .filter((product) => product.stockQuantity <= product.lowStockThreshold)
      .map((product) => ({
        product: product.name,
        currentStock: product.stockQuantity,
        minimumStock: product.lowStockThreshold,
        status: product.stockQuantity === 0 ? "Out of Stock" : "Low",
      }));

    const mappedRecentActivities = auditLogs.map((log) => ({
      title: `${log.action} ${log.entity}`,
      detail: log.details ? JSON.stringify(log.details) : "Updated from store operations",
    }));

    const responseData = {
      stats: {
        totalProducts,
        currentStoreStock,
        lowStockItems,
        outOfStockItems,
        pendingStockRequests: notifications.filter((note) => note.type === "WARNING").length,
        incomingTransfers: recentTransactions.filter((transaction) => transaction.type === "STOCK_IN").length,
        todaysSales: todaySalesCount,
        todaysSalesRevenue: todaySalesRevenue,
        todaysOrders: todayOrders,
      },
      charts: {
        dailySales: Array.from(dailySalesMap.entries()).map(([name, value]) => ({ name, value })),
        monthlySales: Array.from(monthlySalesMap.entries()).map(([name, value]) => ({ name, value })),
        inventoryStatus,
        stockMovement,
        topSellingProducts,
        lowStockCategories,
        weeklyOrders: Array.from(weeklyOrdersMap.entries()).map(([name, value]) => ({ name, value })),
        stockRequestStatus,
      },
      tables: {
        recentStockRequests,
        lowStockProducts: mappedLowStockProducts,
      },
      activities: {
        recentActivities: mappedRecentActivities,
        notifications: notifications.map((note) => note.message),
      },
    };

    apiCache.set(cacheKey, responseData, 5000); // cache for 5 seconds

    return successResponse(responseData);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to fetch store manager dashboard");
  }
}

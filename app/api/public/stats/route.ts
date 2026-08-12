import prisma from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const [totalProducts, totalCategories, totalSuppliers, salesData, lowStockResult, recentSales] =
      await Promise.all([
        prisma.product.count(),
        prisma.category.count(),
        prisma.supplier.count(),
        prisma.sale.aggregate({
          where: { status: "COMPLETED" },
          _count: true,
          _sum: { totalAmount: true },
        }),
        prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*)::int as count FROM "Product"
          WHERE "stockQuantity" <= "lowStockThreshold"
        `,
        prisma.sale.findMany({
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { totalAmount: true, createdAt: true },
        }),
      ]);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const ordersTodayCount = await prisma.sale.count({
      where: {
        createdAt: { gte: startOfToday },
      },
    });

    // Generate bar chart data (last 8 data points or monthly aggregation)
    const monthMap = new Map<string, number>();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Default last 8 months structure
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      monthMap.set(key, 0);
    }

    recentSales.forEach((s) => {
      const d = new Date(s.createdAt);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      if (monthMap.has(key)) {
        monthMap.set(key, (monthMap.get(key) ?? 0) + Number(s.totalAmount));
      }
    });

    const rawChart = Array.from(monthMap.entries()).map(([label, val]) => ({ label, value: val }));
    const maxVal = Math.max(...rawChart.map((c) => c.value), 1);
    const chartBars = rawChart.map((c) => Math.max(Math.round((c.value / maxVal) * 100), 15));

    const totalRevenue = Number(salesData._sum.totalAmount ?? 0);
    const lowStockCount = Number(lowStockResult[0]?.count ?? 0);

    return successResponse({
      totalRevenue,
      totalProducts,
      totalCategories,
      totalSuppliers,
      totalSales: salesData._count,
      lowStockCount,
      ordersToday: ordersTodayCount,
      chartBars: chartBars.length > 0 ? chartBars : [40, 65, 45, 80, 55, 90, 70, 85],
    });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to fetch public stats");
  }
}

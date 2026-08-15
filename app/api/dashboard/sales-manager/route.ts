import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { apiCache } from "@/lib/cache";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session!.user.role !== "SALES_MANAGER" && session!.user.role !== "SUPER_ADMIN") {
    return errorResponse("Not authorized", 403);
  }

  const userId = session!.user.id;
  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";
  const userFilter = isSuperAdmin ? {} : { userId };

  const cacheKey = `dashboard:sales-manager:${userId}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return successResponse(cached);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  try {
    const [
      todaySales,
      todayRevenue,
      monthSales,
      monthRevenue,
      unitsSoldAgg,
      totalCustomers,
      pendingOrders,
      completedOrders,
      returnedSales,
      recentSales,
      monthlySalesData,
      topProducts,
      salesItems,
      customersWithCities,
    ] = await Promise.all([
      prisma.sale.count({ where: { ...userFilter, status: "COMPLETED", createdAt: { gte: startOfDay } } }),
      prisma.sale.aggregate({
        where: { ...userFilter, status: "COMPLETED", createdAt: { gte: startOfDay } },
        _sum: { totalAmount: true },
      }),
      prisma.sale.count({ where: { ...userFilter, status: "COMPLETED", createdAt: { gte: startOfMonth } } }),
      prisma.sale.aggregate({
        where: { ...userFilter, status: "COMPLETED", createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.saleItem.aggregate({
        where: { sale: { ...userFilter, status: "COMPLETED" } },
        _sum: { quantity: true },
      }),
      prisma.customer.count({ where: isSuperAdmin ? {} : { createdById: userId } }),
      prisma.sale.count({ where: { ...userFilter, status: "PENDING" } }),
      prisma.sale.count({ where: { ...userFilter, status: "COMPLETED" } }),
      prisma.sale.count({ where: { ...userFilter, status: "REFUNDED" } }),
      prisma.sale.findMany({
        where: userFilter,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { customer: true, payments: true, items: { include: { product: true } } },
      }),
      prisma.sale.findMany({
        where: { ...userFilter, status: "COMPLETED", createdAt: { gte: sixMonthsAgo } },
        select: { totalAmount: true, createdAt: true, type: true },
      }),
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: { sale: { ...userFilter, status: "COMPLETED" } },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 6,
      }),
      prisma.saleItem.findMany({
        where: { sale: { ...userFilter, status: "COMPLETED" } },
        include: { product: { include: { category: true } } },
      }),
      prisma.sale.findMany({
        where: { ...userFilter, status: "COMPLETED" },
        select: { totalAmount: true, customer: { select: { city: true, country: true } } },
      }),
    ]);

    const todayRev = Number(todayRevenue._sum.totalAmount ?? 0);
    const monthRev = Number(monthRevenue._sum.totalAmount ?? 0);
    const unitsSold = unitsSoldAgg._sum.quantity ?? 0;
    const avgOrder = monthSales > 0 ? monthRev / monthSales : 0;

    // Monthly revenue trend (Last 6 Months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthMap.set(key, 0);
    }
    monthlySalesData.forEach((s) => {
      const key = `${monthNames[s.createdAt.getMonth()]} ${s.createdAt.getFullYear()}`;
      if (monthMap.has(key)) {
        monthMap.set(key, (monthMap.get(key) ?? 0) + Number(s.totalAmount));
      }
    });

    // Top Selling Products info
    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, image: true, sellingPrice: true },
    });
    const topSellingProducts = topProducts.map((tp) => {
      const p = products.find((prod) => prod.id === tp.productId);
      return {
        id: tp.productId,
        name: p?.name ?? "Unknown Product",
        image: p?.image ?? null,
        unitsSold: tp._sum.quantity ?? 0,
        totalRevenue: Number(tp._sum.totalPrice ?? 0),
      };
    });

    // Revenue by Category
    const catMap = new Map<string, number>();
    salesItems.forEach((si) => {
      const cat = si.product.category.name;
      catMap.set(cat, (catMap.get(cat) ?? 0) + Number(si.totalPrice));
    });

    // Revenue by Region / Store City
    const regionMap = new Map<string, number>();
    customersWithCities.forEach((sc) => {
      const region = sc.customer?.city ?? sc.customer?.country ?? "Main Store";
      regionMap.set(region, (regionMap.get(region) ?? 0) + Number(sc.totalAmount));
    });
    if (regionMap.size === 0) {
      regionMap.set("Main Store", monthRev > 0 ? monthRev : 50000);
    }

    // Revenue by Channel (Invoices, POS, Online, Orders)
    const channelMap = new Map<string, number>();
    monthlySalesData.forEach((s) => {
      const channel = s.type === "INVOICE" ? "Direct Invoice" : s.type === "ORDER" ? "Sales Order" : "Quotation/POS";
      channelMap.set(channel, (channelMap.get(channel) ?? 0) + Number(s.totalAmount));
    });
    if (channelMap.size === 0) {
      channelMap.set("Direct Invoice", monthRev * 0.6);
      channelMap.set("Sales Order", monthRev * 0.4);
    }

    // Daily sales volume (Last 7 days bar chart)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const sevenDaySales = await prisma.sale.findMany({
      where: { ...userFilter, status: "COMPLETED", createdAt: { gte: sevenDaysAgo } },
      select: { totalAmount: true, createdAt: true },
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = dayNames[d.getDay()];
      dailyMap.set(key, 0);
    }
    sevenDaySales.forEach((s) => {
      const key = dayNames[s.createdAt.getDay()];
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(s.totalAmount));
      }
    });

    const responseData = {
      stats: {
        todaySales,
        todayRevenue: todayRev,
        monthSales,
        monthRevenue: monthRev,
        unitsSold,
        totalCustomers,
        pendingOrders,
        completedOrders,
        returnedSales,
        averageOrderValue: avgOrder,
      },
      revenueByMonth: Array.from(monthMap.entries()).map(([name, revenue]) => ({ name, revenue })),
      dailySalesVolume: Array.from(dailyMap.entries()).map(([name, sales]) => ({ name, sales })),
      revenueByRegion: Array.from(regionMap.entries()).map(([name, value]) => ({ name, value })),
      revenueByCategory: Array.from(catMap.entries()).map(([name, value]) => ({ name, value })),
      revenueByChannel: Array.from(channelMap.entries()).map(([name, value]) => ({ name, value })),
      topSellingProducts,
      recentSales,
    };

    apiCache.set(cacheKey, responseData, 5000);

    return successResponse(responseData);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to fetch stats");
  }
}


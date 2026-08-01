import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const sales = await prisma.sale.findMany({
      where: { status: "COMPLETED", createdAt: { gte: sixMonthsAgo } },
      select: { totalAmount: true, createdAt: true },
    });

    const monthMap = new Map<string, number>();
    sales.forEach((s) => {
      const key = s.createdAt.toLocaleString("en-US", { month: "short", year: "2-digit" });
      monthMap.set(key, (monthMap.get(key) ?? 0) + Number(s.totalAmount));
    });
    const salesByMonth = Array.from(monthMap.entries()).map(([name, value]) => ({ name, value }));

    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
    });
    const productsByCategory = categories.map((c) => ({
      name: c.name,
      value: c._count.products,
    }));

    const products = await prisma.product.findMany({
      select: { name: true, stockQuantity: true, lowStockThreshold: true },
      take: 10,
      orderBy: { stockQuantity: "desc" },
    });
    const stockAnalytics = products.map((p) => ({
      name: p.name.slice(0, 15),
      stock: p.stockQuantity,
      threshold: p.lowStockThreshold,
    }));

    return successResponse({ salesByMonth, productsByCategory, stockAnalytics });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to fetch charts");
  }
}

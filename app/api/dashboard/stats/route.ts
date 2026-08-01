import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const [totalProducts, totalCategories, totalSuppliers, salesData, lowStockResult] =
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
      ]);

    return successResponse({
      totalProducts,
      totalCategories,
      totalSuppliers,
      totalSales: salesData._count,
      revenue: Number(salesData._sum.totalAmount ?? 0),
      lowStock: Number(lowStockResult[0]?.count ?? 0),
    });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to fetch stats");
  }
}

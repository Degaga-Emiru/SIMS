import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const products = await prisma.product.findMany({
      include: { category: true, supplier: true },
      orderBy: { name: "asc" },
    });

    const report = products.map((p) => ({
      name: p.name,
      sku: p.sku,
      category: p.category.name,
      supplier: p.supplier?.name ?? "N/A",
      stock: p.stockQuantity,
      threshold: p.lowStockThreshold,
      status: p.status,
      price: Number(p.sellingPrice),
    }));

    return successResponse(report);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to generate report");
  }
}

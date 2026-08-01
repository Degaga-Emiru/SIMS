import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const products = await prisma.$queryRaw<
      Array<{ id: string; name: string; sku: string; stockQuantity: number; lowStockThreshold: number }>
    >`
      SELECT id, name, sku, "stockQuantity", "lowStockThreshold"
      FROM "Product"
      WHERE "stockQuantity" <= "lowStockThreshold" AND status = 'ACTIVE'
      ORDER BY "stockQuantity" ASC
      LIMIT 50
    `;
    return successResponse(products);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to fetch low stock");
  }
}

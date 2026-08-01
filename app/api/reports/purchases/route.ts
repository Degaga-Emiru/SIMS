import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: { supplier: true, items: true },
      orderBy: { createdAt: "desc" },
    });

    const report = orders.map((o) => ({
      orderNumber: o.orderNumber,
      supplier: o.supplier.name,
      status: o.status,
      items: o.items.length,
      total: Number(o.totalAmount),
      date: o.createdAt.toISOString(),
    }));

    return successResponse(report);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to generate report");
  }
}

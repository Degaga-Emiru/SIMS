import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: { select: { products: true, purchaseOrders: true } },
        purchaseOrders: { select: { totalAmount: true, status: true } },
      },
    });

    const report = suppliers.map((s) => ({
      name: s.name,
      email: s.email ?? "N/A",
      phone: s.phone ?? "N/A",
      products: s._count.products,
      orders: s._count.purchaseOrders,
      totalSpent: s.purchaseOrders
        .filter((o) => o.status === "RECEIVED")
        .reduce((sum, o) => sum + Number(o.totalAmount), 0),
    }));

    return successResponse(report);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to generate report");
  }
}

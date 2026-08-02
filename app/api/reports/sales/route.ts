import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const scope = request.nextUrl.searchParams.get("scope");

  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  const userFilter =
    session!.user.role === "SALES_MANAGER" || scope === "own"
      ? { userId: session!.user.id }
      : {};

  try {
    const sales = await prisma.sale.findMany({
      where: {
        status: "COMPLETED",
        ...userFilter,
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });

    const report = sales.map((s) => ({
      invoice: s.invoiceNumber,
      customer: s.customer?.name ?? "Walk-in",
      items: s.items.length,
      subtotal: Number(s.subtotal),
      tax: Number(s.taxAmount),
      total: Number(s.totalAmount),
      date: s.createdAt.toISOString(),
    }));

    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + Number(s.totalAmount), 0),
    };

    return successResponse({ report, summary });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to generate report");
  }
}

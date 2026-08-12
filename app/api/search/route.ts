import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return errorResponse("Search query must be at least 2 characters", 400);
  }

  const [products, sales, customers] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
        status: true,
        image: true,
        category: { select: { name: true } },
      },
      take: 8,
    }),
    prisma.sale.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: q, mode: "insensitive" } },
          { customer: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
      },
      take: 8,
    }),
  ]);

  const total = products.length + sales.length + customers.length;

  return successResponse({ products, sales, customers, total });
}

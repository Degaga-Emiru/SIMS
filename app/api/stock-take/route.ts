import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const createStockTakeSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

  const [data, total] = await Promise.all([
    prisma.stockTake.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        warehouse: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: { select: { id: true, variance: true } },
      },
    }),
    prisma.stockTake.count(),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;
  if (!["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"].includes(role)) {
    return errorResponse("You do not have permission to start a stock take", 403);
  }

  const { data, error: validationError } = await validateBody(request, createStockTakeSchema);
  if (validationError) return validationError;

  const { warehouseId, notes } = data!;

  try {
    // Check if there's already an IN_PROGRESS stock take for this warehouse
    const existing = await prisma.stockTake.findFirst({
      where: { warehouseId, status: "IN_PROGRESS" },
    });
    if (existing) {
      return errorResponse("There is already an active stock take for this warehouse. Complete it first.", 400);
    }

    // Get all products stocked in this warehouse
    const warehouseStocks = await prisma.warehouseStock.findMany({
      where: { warehouseId },
      include: { product: { select: { id: true, name: true, sku: true } } },
    });

    if (warehouseStocks.length === 0) {
      return errorResponse("No products found in this warehouse", 400);
    }

    const count = await prisma.stockTake.count();
    const reference = `ST-${String(count + 1).padStart(5, "0")}`;

    const stockTake = await prisma.stockTake.create({
      data: {
        reference,
        warehouseId,
        userId: session!.user.id,
        notes,
        items: {
          create: warehouseStocks.map((ws) => ({
            productId: ws.productId,
            expectedQty: ws.quantity,
            countedQty: 0,
            variance: 0,
          })),
        },
      },
      include: {
        warehouse: { select: { name: true } },
        user: { select: { name: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
      },
    });

    await createAuditLog(session!.user.id, "CREATE", "StockTake", stockTake.id, {
      reference,
      warehouseId,
      itemCount: warehouseStocks.length,
    });

    return successResponse(stockTake, `Stock take ${reference} started with ${warehouseStocks.length} products`);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to start stock take", 400);
  }
}

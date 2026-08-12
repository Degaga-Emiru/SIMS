import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const createTransferSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  fromWarehouseId: z.string().min(1, "Source warehouse is required"),
  toWarehouseId: z.string().min(1, "Destination warehouse is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const status = request.nextUrl.searchParams.get("status");

  const where = status ? { status: status as never } : {};

  const [data, total] = await Promise.all([
    prisma.stockTransfer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        fromWarehouse: { select: { id: true, name: true } },
        toWarehouse: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
        dispatchedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.stockTransfer.count({ where }),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;
  if (!["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"].includes(role)) {
    return errorResponse("You do not have permission to create stock transfers", 403);
  }

  const { data, error: validationError } = await validateBody(request, createTransferSchema);
  if (validationError) return validationError;

  const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = data!;

  if (fromWarehouseId === toWarehouseId) {
    return errorResponse("Source and destination warehouses must be different", 400);
  }

  try {
    // Verify source warehouse has enough stock
    const fromStock = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId: fromWarehouseId, productId } },
    });
    if (!fromStock || fromStock.quantity < quantity) {
      return errorResponse(
        `Insufficient stock in source warehouse. Available: ${fromStock?.quantity ?? 0}`,
        400
      );
    }

    const count = await prisma.stockTransfer.count();
    const transferNumber = `TRF-${String(count + 1).padStart(5, "0")}`;

    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNumber,
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
        notes,
        requestedById: session!.user.id,
      },
      include: {
        product: { select: { name: true, sku: true } },
        fromWarehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
        requestedBy: { select: { name: true } },
      },
    });

    await createAuditLog(session!.user.id, "CREATE", "StockTransfer", transfer.id, {
      transferNumber,
      productId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
    });

    return successResponse(transfer, `Transfer ${transferNumber} created successfully`);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to create transfer", 400);
  }
}

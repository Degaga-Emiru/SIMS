import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const updateStockSchema = z.object({
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
});

/**
 * PUT /api/warehouses/[id]/products/[stockId]
 * Updates stock quantity directly.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stockId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;
  if (!["SUPER_ADMIN", "INVENTORY_MANAGER"].includes(role)) {
    return errorResponse("Forbidden", 403);
  }

  const { id: warehouseId, stockId } = await params;
  const { data, error: validationError } = await validateBody(request, updateStockSchema);
  if (validationError) return validationError;

  const { quantity } = data!;

  try {
    const stock = await prisma.warehouseStock.findUniqueOrThrow({
      where: { id: stockId },
      include: { product: true },
    });

    if (stock.warehouseId !== warehouseId) {
      return errorResponse("Stock mapping does not match warehouse", 400);
    }

    const previousQty = stock.quantity;
    const diff = quantity - previousQty;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.warehouseStock.update({
        where: { id: stockId },
        data: { quantity },
      });

      // Update product global stock quantity
      await tx.product.update({
        where: { id: stock.productId },
        data: { stockQuantity: { increment: diff } },
      });

      // Record transaction
      if (diff !== 0) {
        await tx.inventoryTransaction.create({
          data: {
            productId: stock.productId,
            warehouseId,
            type: "ADJUSTMENT",
            quantity: Math.abs(diff),
            previousQty,
            newQty: quantity,
            reason: `Direct stock level update in warehouse`,
            userId: session!.user.id,
          },
        });
      }

      return updated;
    });

    await createAuditLog(session!.user.id, "UPDATE_STOCK", "Warehouse", warehouseId, {
      productId: stock.productId,
      quantity,
    });

    return successResponse(result, `Stock level updated to ${quantity}`);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to update stock", 400);
  }
}

/**
 * DELETE /api/warehouses/[id]/products/[stockId]
 * Deletes association (and zeros out quantity).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stockId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;
  if (!["SUPER_ADMIN", "INVENTORY_MANAGER"].includes(role)) {
    return errorResponse("Forbidden", 403);
  }

  const { id: warehouseId, stockId } = await params;

  try {
    const stock = await prisma.warehouseStock.findUniqueOrThrow({
      where: { id: stockId },
    });

    if (stock.warehouseId !== warehouseId) {
      return errorResponse("Stock mapping does not match warehouse", 400);
    }

    await prisma.$transaction(async (tx) => {
      // Deduct from global quantity
      if (stock.quantity > 0) {
        await tx.product.update({
          where: { id: stock.productId },
          data: { stockQuantity: { decrement: stock.quantity } },
        });

        // Record transaction
        await tx.inventoryTransaction.create({
          data: {
            productId: stock.productId,
            warehouseId,
            type: "STOCK_OUT",
            quantity: stock.quantity,
            previousQty: stock.quantity,
            newQty: 0,
            reason: `Product removed from warehouse stock listing`,
            userId: session!.user.id,
          },
        });
      }

      // Delete mapping
      await tx.warehouseStock.delete({ where: { id: stockId } });
    });

    await createAuditLog(session!.user.id, "REMOVE_PRODUCT", "Warehouse", warehouseId, {
      productId: stock.productId,
    });

    return successResponse(null, "Product removed from warehouse");
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to remove product from warehouse", 400);
  }
}

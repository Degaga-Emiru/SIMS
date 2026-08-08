import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const transferSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  fromWarehouseId: z.string().min(1, "Source warehouse is required"),
  toWarehouseId: z.string().min(1, "Destination warehouse is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;
  if (!["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"].includes(role)) {
    return errorResponse("You do not have permission to transfer stock", 403);
  }

  const { data, error: validationError } = await validateBody(request, transferSchema);
  if (validationError) return validationError;

  const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = data!;

  if (fromWarehouseId === toWarehouseId) {
    return errorResponse("Source and destination warehouses must be different", 400);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });

      const fromStock = await tx.warehouseStock.findUnique({
        where: { warehouseId_productId: { warehouseId: fromWarehouseId, productId } },
      });

      if (!fromStock || fromStock.quantity < quantity) {
        throw new Error(
          `Insufficient stock in source warehouse. Available: ${fromStock?.quantity ?? 0}`
        );
      }

      // Deduct from source warehouse
      await tx.warehouseStock.update({
        where: { id: fromStock.id },
        data: { quantity: { decrement: quantity } },
      });

      // Add to destination warehouse (upsert)
      await tx.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId: toWarehouseId, productId } },
        create: { warehouseId: toWarehouseId, productId, quantity },
        update: { quantity: { increment: quantity } },
      });

      // Record STOCK_OUT from source
      const outTx = await tx.inventoryTransaction.create({
        data: {
          productId,
          warehouseId: fromWarehouseId,
          type: "STOCK_OUT",
          quantity,
          previousQty: fromStock.quantity,
          newQty: fromStock.quantity - quantity,
          reason: notes ?? `Transfer to warehouse`,
          userId: session!.user.id,
        },
      });

      // Record STOCK_IN to destination
      const toStock = await tx.warehouseStock.findUnique({
        where: { warehouseId_productId: { warehouseId: toWarehouseId, productId } },
      });
      await tx.inventoryTransaction.create({
        data: {
          productId,
          warehouseId: toWarehouseId,
          type: "STOCK_IN",
          quantity,
          previousQty: (toStock?.quantity ?? quantity) - quantity,
          newQty: toStock?.quantity ?? quantity,
          reason: notes ?? `Transfer from warehouse`,
          userId: session!.user.id,
        },
      });

      return { product: product.name, quantity, outTxId: outTx.id };
    });

    await createAuditLog(session!.user.id, "TRANSFER", "Inventory", productId, {
      fromWarehouseId,
      toWarehouseId,
      quantity,
      notes,
    });

    return successResponse(result, `Transferred ${result.quantity} units of ${result.product}`);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Transfer failed", 400);
  }
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const productId = request.nextUrl.searchParams.get("productId");

  const stocks = await prisma.warehouseStock.findMany({
    where: productId ? { productId } : undefined,
    include: {
      warehouse: { select: { id: true, name: true, location: true } },
      product: { select: { id: true, name: true, sku: true, stockQuantity: true } },
    },
    orderBy: { warehouse: { name: "asc" } },
  });

  return successResponse(stocks);
}

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;
  if (!["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"].includes(role)) {
    return errorResponse("You do not have permission to receive stock transfers", 403);
  }

  const { id } = await params;

  try {
    const transfer = await prisma.stockTransfer.findUniqueOrThrow({
      where: { id },
      include: {
        product: true,
        fromWarehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
      },
    });

    if (transfer.status !== "DISPATCHED") {
      return errorResponse(`Cannot receive a transfer with status: ${transfer.status}`, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Add stock to destination warehouse
      const toStock = await tx.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId: transfer.toWarehouseId, productId: transfer.productId } },
        create: { warehouseId: transfer.toWarehouseId, productId: transfer.productId, quantity: transfer.quantity },
        update: { quantity: { increment: transfer.quantity } },
      });

      const prevQty = toStock.quantity - transfer.quantity;

      // Record TRANSFER_IN transaction
      await tx.inventoryTransaction.create({
        data: {
          productId: transfer.productId,
          warehouseId: transfer.toWarehouseId,
          type: "TRANSFER_IN",
          quantity: transfer.quantity,
          previousQty: prevQty,
          newQty: toStock.quantity,
          reason: `Transfer ${transfer.transferNumber} received from ${transfer.fromWarehouse.name}`,
          userId: session!.user.id,
          transferId: transfer.id,
        },
      });

      // Update global product stock
      await tx.product.update({
        where: { id: transfer.productId },
        data: { stockQuantity: { increment: transfer.quantity } },
      });

      // Mark as RECEIVED
      return tx.stockTransfer.update({
        where: { id },
        data: {
          status: "RECEIVED",
          receivedById: session!.user.id,
          receivedAt: new Date(),
        },
        include: {
          product: { select: { name: true, sku: true } },
          fromWarehouse: { select: { name: true } },
          toWarehouse: { select: { name: true } },
        },
      });
    });

    await createAuditLog(session!.user.id, "RECEIVE", "StockTransfer", id, {
      transferNumber: transfer.transferNumber,
      quantity: transfer.quantity,
      toWarehouse: transfer.toWarehouse.name,
    });

    return successResponse(result, `Transfer ${transfer.transferNumber} received successfully`);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Receive failed", 400);
  }
}

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
  if (!["SUPER_ADMIN", "INVENTORY_MANAGER"].includes(role)) {
    return errorResponse("Only Inventory Managers can dispatch transfers", 403);
  }

  const { id } = await params;

  try {
    const transfer = await prisma.stockTransfer.findUniqueOrThrow({
      where: { id },
      include: { product: true },
    });

    if (transfer.status !== "PENDING") {
      return errorResponse(`Cannot dispatch a transfer with status: ${transfer.status}`, 400);
    }

    // Deduct from source warehouse at dispatch time
    const result = await prisma.$transaction(async (tx) => {
      const fromStock = await tx.warehouseStock.findUnique({
        where: { warehouseId_productId: { warehouseId: transfer.fromWarehouseId, productId: transfer.productId } },
      });

      if (!fromStock || fromStock.quantity < transfer.quantity) {
        throw new Error(
          `Insufficient stock in source warehouse. Available: ${fromStock?.quantity ?? 0}`
        );
      }

      // Deduct from source
      const updatedFrom = await tx.warehouseStock.update({
        where: { id: fromStock.id },
        data: { quantity: { decrement: transfer.quantity } },
      });

      // Record TRANSFER_OUT transaction
      await tx.inventoryTransaction.create({
        data: {
          productId: transfer.productId,
          warehouseId: transfer.fromWarehouseId,
          type: "TRANSFER_OUT",
          quantity: transfer.quantity,
          previousQty: fromStock.quantity,
          newQty: updatedFrom.quantity,
          reason: `Transfer ${transfer.transferNumber} dispatched to ${transfer.toWarehouseId}`,
          userId: session!.user.id,
          transferId: transfer.id,
        },
      });

      // Update global product stock
      await tx.product.update({
        where: { id: transfer.productId },
        data: { stockQuantity: { decrement: transfer.quantity } },
      });

      // Mark transfer as DISPATCHED
      return tx.stockTransfer.update({
        where: { id },
        data: {
          status: "DISPATCHED",
          dispatchedById: session!.user.id,
          dispatchedAt: new Date(),
        },
        include: {
          product: { select: { name: true, sku: true } },
          fromWarehouse: { select: { name: true } },
          toWarehouse: { select: { name: true } },
        },
      });
    });

    await createAuditLog(session!.user.id, "DISPATCH", "StockTransfer", id, {
      transferNumber: transfer.transferNumber,
      quantity: transfer.quantity,
    });

    return successResponse(result, `Transfer ${transfer.transferNumber} dispatched successfully`);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Dispatch failed", 400);
  }
}

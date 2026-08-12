import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

/** Cancel a PENDING transfer */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;
  if (!["SUPER_ADMIN", "INVENTORY_MANAGER"].includes(role)) {
    return errorResponse("Only Inventory Managers can cancel transfers", 403);
  }

  const { id } = await params;

  try {
    const transfer = await prisma.stockTransfer.findUniqueOrThrow({ where: { id } });

    if (!["PENDING", "DISPATCHED"].includes(transfer.status)) {
      return errorResponse(`Cannot cancel a transfer with status: ${transfer.status}`, 400);
    }

    // If already dispatched, we need to restore source stock
    if (transfer.status === "DISPATCHED") {
      await prisma.$transaction(async (tx) => {
        const fromStock = await tx.warehouseStock.findUnique({
          where: { warehouseId_productId: { warehouseId: transfer.fromWarehouseId, productId: transfer.productId } },
        });

        const prevQty = fromStock?.quantity ?? 0;
        await tx.warehouseStock.upsert({
          where: { warehouseId_productId: { warehouseId: transfer.fromWarehouseId, productId: transfer.productId } },
          create: { warehouseId: transfer.fromWarehouseId, productId: transfer.productId, quantity: transfer.quantity },
          update: { quantity: { increment: transfer.quantity } },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: transfer.productId,
            warehouseId: transfer.fromWarehouseId,
            type: "STOCK_IN",
            quantity: transfer.quantity,
            previousQty: prevQty,
            newQty: prevQty + transfer.quantity,
            reason: `Transfer ${transfer.transferNumber} cancelled — stock returned to source`,
            userId: session!.user.id,
            transferId: transfer.id,
          },
        });

        await tx.product.update({
          where: { id: transfer.productId },
          data: { stockQuantity: { increment: transfer.quantity } },
        });
      });
    }

    const updated = await prisma.stockTransfer.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await createAuditLog(session!.user.id, "CANCEL", "StockTransfer", id, {
      transferNumber: transfer.transferNumber,
    });

    return successResponse(updated, "Transfer cancelled");
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Cancel failed", 400);
  }
}

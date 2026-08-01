import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id, status: "APPROVED" },
        include: { items: true },
      });

      for (const item of po.items) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        const newQty = product.stockQuantity + item.quantity;
        await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: newQty } });
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: "STOCK_IN",
            quantity: item.quantity,
            previousQty: product.stockQuantity,
            newQty,
            reason: `PO ${po.orderNumber} received`,
            userId: session!.user.id,
          },
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: "RECEIVED", receivedAt: new Date() },
        include: { supplier: true, items: { include: { product: true } } },
      });
    });

    await createAuditLog(session!.user.id, "RECEIVE", "PurchaseOrder", id);
    return successResponse(order);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to receive order", 400);
  }
}

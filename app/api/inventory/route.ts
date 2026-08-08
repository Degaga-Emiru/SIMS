import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { inventoryTransactionSchema } from "@/lib/validations";
import { canWriteInventory } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

  const [data, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.inventoryTransaction.count(),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!canWriteInventory(session!.user.role)) {
    return errorResponse("You do not have permission to modify inventory", 403);
  }

  const { data, error: validationError } = await validateBody(request, inventoryTransactionSchema);
  if (validationError) return validationError;

  const { productId, warehouseId, type, quantity, reason } = data!;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
      const warehouseStock = await tx.warehouseStock.findUnique({
        where: { warehouseId_productId: { warehouseId, productId } },
      });

      const previousQty = warehouseStock?.quantity || 0;
      let newQty = previousQty;

      if (type === "STOCK_IN" || type === "RETURNED") newQty = previousQty + quantity;
      else if (["STOCK_OUT", "DAMAGE", "LOST", "EXPIRED"].includes(type)) {
        if (previousQty < quantity) throw new Error(`Insufficient stock in warehouse for ${type}`);
        newQty = previousQty - quantity;
      } else if (type === "ADJUSTMENT") {
        newQty = quantity;
      }

      const diff = newQty - previousQty;

      if (warehouseStock) {
        await tx.warehouseStock.update({
          where: { id: warehouseStock.id },
          data: { quantity: newQty },
        });
      } else {
        await tx.warehouseStock.create({
          data: { warehouseId, productId, quantity: newQty },
        });
      }

      await tx.product.update({ 
        where: { id: productId }, 
        data: { stockQuantity: { increment: diff } } 
      });

      const transaction = await tx.inventoryTransaction.create({
        data: { productId, warehouseId, type, quantity, previousQty, newQty, reason, userId: session!.user.id },
        include: { product: { select: { name: true, sku: true } }, warehouse: { select: { name: true } } },
      });

      const newGlobalQty = product.stockQuantity + diff;
      if (newGlobalQty <= product.lowStockThreshold) {
        await tx.notification.create({
          data: {
            title: "Low Stock Alert",
            message: `${product.name} is running low globally (${newGlobalQty} remaining)`,
            type: "LOW_STOCK",
            userId: session!.user.id,
          },
        });
      }

      return transaction;
    });

    await createAuditLog(session!.user.id, type, "Inventory", productId, { quantity, reason });
    return successResponse(result);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Transaction failed", 400);
  }
}

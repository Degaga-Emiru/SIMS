import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { inventoryTransactionSchema } from "@/lib/validations";

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

  const { data, error: validationError } = await validateBody(request, inventoryTransactionSchema);
  if (validationError) return validationError;

  const { productId, type, quantity, reason } = data!;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
      const previousQty = product.stockQuantity;
      let newQty = previousQty;

      if (type === "STOCK_IN") newQty = previousQty + quantity;
      else if (type === "STOCK_OUT") {
        if (previousQty < quantity) throw new Error("Insufficient stock");
        newQty = previousQty - quantity;
      } else {
        newQty = quantity;
      }

      await tx.product.update({ where: { id: productId }, data: { stockQuantity: newQty } });

      const transaction = await tx.inventoryTransaction.create({
        data: { productId, type, quantity, previousQty, newQty, reason, userId: session!.user.id },
        include: { product: { select: { name: true, sku: true } } },
      });

      if (newQty <= product.lowStockThreshold) {
        await tx.notification.create({
          data: {
            title: "Low Stock Alert",
            message: `${product.name} is running low (${newQty} remaining)`,
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

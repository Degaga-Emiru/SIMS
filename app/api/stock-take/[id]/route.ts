import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const updateItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      countedQty: z.coerce.number().int().min(0),
      notes: z.string().optional(),
    })
  ),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const stockTake = await prisma.stockTake.findUnique({
    where: { id },
    include: {
      warehouse: { select: { id: true, name: true, location: true } },
      user: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, image: true } },
        },
        orderBy: { product: { name: "asc" } },
      },
    },
  });

  if (!stockTake) return errorResponse("Stock take not found", 404);
  return successResponse(stockTake);
}

/** PATCH — Update counted quantities for one or more items */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const { data, error: validationError } = await validateBody(request, updateItemsSchema);
  if (validationError) return validationError;

  const stockTake = await prisma.stockTake.findUnique({ where: { id } });
  if (!stockTake) return errorResponse("Stock take not found", 404);
  if (stockTake.status !== "IN_PROGRESS") {
    return errorResponse("This stock take has already been completed or cancelled", 400);
  }

  try {
    const updates = await Promise.all(
      data!.items.map(async (item) => {
        const existing = await prisma.stockTakeItem.findUnique({ where: { id: item.id } });
        if (!existing) throw new Error(`Item ${item.id} not found`);

        const variance = item.countedQty - existing.expectedQty;
        return prisma.stockTakeItem.update({
          where: { id: item.id },
          data: {
            countedQty: item.countedQty,
            variance,
            notes: item.notes,
          },
        });
      })
    );

    return successResponse(updates, "Items updated successfully");
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Update failed", 400);
  }
}

/** POST /api/stock-take/[id]/finalize — Commit variances as ADJUSTMENT transactions */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;
  if (!["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"].includes(role)) {
    return errorResponse("You do not have permission to finalize stock takes", 403);
  }

  const { id } = await params;

  try {
    const stockTake = await prisma.stockTake.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        warehouse: true,
      },
    });

    if (!stockTake) return errorResponse("Stock take not found", 404);
    if (stockTake.status !== "IN_PROGRESS") {
      return errorResponse("This stock take is not in progress", 400);
    }

    // Items with variance
    const variantItems = stockTake.items.filter((i) => i.countedQty !== i.expectedQty);

    const result = await prisma.$transaction(async (tx) => {
      const adjustments = [];

      for (const item of variantItems) {
        const warehouseStock = await tx.warehouseStock.findUnique({
          where: { warehouseId_productId: { warehouseId: stockTake.warehouseId, productId: item.productId } },
        });

        if (!warehouseStock) continue;

        const diff = item.countedQty - item.expectedQty;

        // Set warehouse stock to counted quantity
        await tx.warehouseStock.update({
          where: { id: warehouseStock.id },
          data: { quantity: item.countedQty },
        });

        // Adjust global product quantity
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: diff } },
        });

        // Record ADJUSTMENT transaction
        const adj = await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            warehouseId: stockTake.warehouseId,
            type: "ADJUSTMENT",
            quantity: Math.abs(diff),
            previousQty: item.expectedQty,
            newQty: item.countedQty,
            reason: `Stock take ${stockTake.reference} — physical count adjustment`,
            userId: session!.user.id,
          },
        });
        adjustments.push(adj);
      }

      // Mark stock take as COMPLETED
      const completed = await tx.stockTake.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      return { stockTake: completed, adjustmentsCreated: adjustments.length, variantItems: variantItems.length };
    });

    await createAuditLog(session!.user.id, "FINALIZE", "StockTake", id, {
      reference: stockTake.reference,
      adjustments: result.adjustmentsCreated,
    });

    return successResponse(result, `Stock take finalized. ${result.adjustmentsCreated} adjustment${result.adjustmentsCreated !== 1 ? "s" : ""} recorded.`);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Finalize failed", 400);
  }
}

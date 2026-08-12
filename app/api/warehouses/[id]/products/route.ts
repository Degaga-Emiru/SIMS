import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const addProductSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/warehouses/[id]/products
 * Returns all products stocked in this warehouse with quantities.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

  const [data, total] = await Promise.all([
    prisma.warehouseStock.findMany({
      where: { warehouseId: id },
      skip,
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            sellingPrice: true,
            image: true,
            status: true,
          },
        },
      },
      orderBy: { product: { name: "asc" } },
    }),
    prisma.warehouseStock.count({ where: { warehouseId: id } }),
  ]);

  return paginatedResponse(data, total, page, limit);
}

/**
 * POST /api/warehouses/[id]/products
 * Associates a product with a warehouse (creates WarehouseStock).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;
  if (!["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"].includes(role)) {
    return errorResponse("Forbidden", 403);
  }

  const { id: warehouseId } = await params;
  const { data, error: validationError } = await validateBody(request, addProductSchema);
  if (validationError) return validationError;

  const { productId, quantity } = data!;

  try {
    // Check if association already exists
    const existing = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
    });

    if (existing) {
      return errorResponse("Product is already mapped to this warehouse", 400);
    }

    const warehouse = await prisma.warehouse.findUniqueOrThrow({ where: { id: warehouseId } });
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

    const result = await prisma.$transaction(async (tx) => {
      // Create stock mapping
      const stock = await tx.warehouseStock.create({
        data: {
          warehouseId,
          productId,
          quantity,
        },
      });

      // Update product global stock quantity
      if (quantity > 0) {
        await tx.product.update({
          where: { id: productId },
          data: { stockQuantity: { increment: quantity } },
        });

        // Record STOCK_IN transaction
        await tx.inventoryTransaction.create({
          data: {
            productId,
            warehouseId,
            type: "STOCK_IN",
            quantity,
            previousQty: 0,
            newQty: quantity,
            reason: `Initial stock assignment to warehouse: ${warehouse.name}`,
            userId: session!.user.id,
          },
        });
      }

      return stock;
    });

    await createAuditLog(session!.user.id, "ADD_PRODUCT", "Warehouse", warehouseId, {
      productId,
      quantity,
    });

    return successResponse(result, `Product ${product.name} added to warehouse successfully`);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to add product to warehouse", 400);
  }
}

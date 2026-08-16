import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

/**
 * POST /api/inventory/auto-reorder
 * Scans all products at or below lowStockThreshold and creates DRAFT Purchase Orders
 * grouped by supplier. Returns a summary of created POs.
 */
export async function POST(_request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;
  if (!["SUPER_ADMIN", "INVENTORY_MANAGER"].includes(role)) {
    return errorResponse("Only Inventory Managers can trigger auto-reorder", 403);
  }

  try {
    // Find all active products that have a supplier
    const allProducts = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        supplierId: { not: null },
      },
      include: {
        supplier: true,
        category: true,
      },
    });

    // Filter in JS: stock at or below threshold
    const lowStockProducts = allProducts.filter(
      (p) => p.stockQuantity <= p.lowStockThreshold
    );

    if (lowStockProducts.length === 0) {
      return successResponse({ ordersCreated: 0, products: [] }, "No low-stock products with suppliers found");
    }

    // Group by supplier
    const bySupplier = new Map<string, typeof lowStockProducts>();
    for (const p of lowStockProducts) {
      if (!p.supplierId) continue;
      const existing = bySupplier.get(p.supplierId) ?? [];
      existing.push(p);
      bySupplier.set(p.supplierId, existing);
    }

    const createdOrders: { orderNumber: string; supplier: string; items: number }[] = [];
    const poCount = await prisma.purchaseOrder.count();
    let offset = 0;

    for (const [supplierId, products] of bySupplier.entries()) {
      offset++;
      const orderNumber = `PO-AUTO-${String(poCount + offset).padStart(5, "0")}`;

      const MAX_DECIMAL = 99999999.99;

      const items = products.map((p) => {
        const rawQty = Math.max(
          (p.maxStock ?? p.lowStockThreshold * 3) - p.stockQuantity,
          p.lowStockThreshold
        );
        const quantity = Math.min(Math.max(1, Math.floor(rawQty)), 100000);
        const rawUnitPrice = Number(p.price) || 0;
        const unitPrice = Math.min(Math.max(0, Math.round(rawUnitPrice * 100) / 100), MAX_DECIMAL);
        const rawTotalPrice = Math.round(quantity * unitPrice * 100) / 100;
        const totalPrice = Math.min(rawTotalPrice, MAX_DECIMAL);

        return {
          productId: p.id,
          quantity,
          unitPrice,
          totalPrice,
        };
      });

      const rawTotalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
      const totalAmount = Math.min(Math.round(rawTotalAmount * 100) / 100, MAX_DECIMAL);

      await prisma.purchaseOrder.create({
        data: {
          orderNumber,
          status: "REQUESTED",
          supplierId,
          totalAmount,
          notes: `Auto-generated reorder — ${new Date().toLocaleDateString()}`,
          userId: session!.user.id,
          requestedById: session!.user.id,
          items: {
            create: items,
          },
        },
      });

      const supplierName = products[0].supplier!.name;
      createdOrders.push({ orderNumber, supplier: supplierName, items: items.length });

      // Notify inventory managers
      await prisma.notification.create({
        data: {
          title: "Auto Reorder Created",
          message: `Purchase order ${orderNumber} created for ${supplierName} (${items.length} product${items.length > 1 ? "s" : ""})`,
          type: "LOW_STOCK",
          userId: session!.user.id,
        },
      });
    }

    await createAuditLog(session!.user.id, "AUTO_REORDER", "PurchaseOrder", undefined, {
      ordersCreated: createdOrders.length,
      orders: createdOrders,
    });

    return successResponse(
      { ordersCreated: createdOrders.length, orders: createdOrders },
      `Auto-reorder complete: ${createdOrders.length} purchase order${createdOrders.length !== 1 ? "s" : ""} created`
    );
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Auto-reorder failed", 400);
  }
}

/**
 * GET /api/inventory/auto-reorder
 * Returns a preview of which products would be reordered (dry-run)
 */
export async function GET(_request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const allProducts = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      supplierId: { not: null },
    },
    include: { supplier: { select: { name: true } } },
    orderBy: { stockQuantity: "asc" },
  });

  const lowStockProducts = allProducts.filter(
    (p) => p.stockQuantity <= p.lowStockThreshold
  );

  return successResponse(lowStockProducts);
}

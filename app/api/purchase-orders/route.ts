import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { purchaseOrderSchema } from "@/lib/validations";
import { generateOrderNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

  const [data, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { supplier: true, items: { include: { product: true } }, user: { select: { name: true } } },
    }),
    prisma.purchaseOrder.count(),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, purchaseOrderSchema);
  if (validationError) return validationError;

  const totalAmount = data!.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  try {
    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber: generateOrderNumber("PO"),
        supplierId: data!.supplierId,
        notes: data!.notes,
        totalAmount,
        userId: session!.user.id,
        items: {
          create: data!.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { supplier: true, items: { include: { product: true } } },
    });

    await createAuditLog(session!.user.id, "CREATE", "PurchaseOrder", order.id);
    return successResponse(order);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to create order", 400);
  }
}

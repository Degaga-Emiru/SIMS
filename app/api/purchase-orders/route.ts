import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { purchaseOrderSchema } from "@/lib/validations";
import { generateOrderNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const role = session!.user.role;

  // Store managers only see their own requests
  const where = role === "STORE_MANAGER"
    ? { requestedById: session!.user.id }
    : {};

  const [data, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: true,
        items: { include: { product: true } },
        user: { select: { name: true } },
        requestedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;
  const canCreate = ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"].includes(role);
  if (!canCreate) return errorResponse("You do not have permission to create purchase orders", 403);

  const { data, error: validationError } = await validateBody(request, purchaseOrderSchema);
  if (validationError) return validationError;

  const MAX_DECIMAL = 99999999.99;
  const itemsData = data!.items.map((item) => {
    const unitPrice = Math.round(item.unitPrice * 100) / 100;
    const totalPrice = Math.round(item.quantity * unitPrice * 100) / 100;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
    };
  });

  const rawTotalAmount = itemsData.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalAmount = Math.round(rawTotalAmount * 100) / 100;

  if (totalAmount > MAX_DECIMAL || itemsData.some((i) => i.unitPrice > MAX_DECIMAL || i.totalPrice > MAX_DECIMAL)) {
    return errorResponse("Total amount or item price exceeds maximum supported limit (99,999,999.99)", 400);
  }

  // Store managers submit as REQUESTED; inventory/admin create directly as PENDING
  const initialStatus = role === "STORE_MANAGER" ? "REQUESTED" : "PENDING";

  try {
    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber: generateOrderNumber("PO"),
        supplierId: data!.supplierId,
        notes: data!.notes,
        totalAmount,
        status: initialStatus,
        userId: session!.user.id,
        requestedById: role === "STORE_MANAGER" ? session!.user.id : undefined,
        items: {
          create: itemsData,
        },
      },
      include: { supplier: true, items: { include: { product: true } } },
    });

    await createAuditLog(session!.user.id, "CREATE", "PurchaseOrder", order.id, { status: initialStatus });
    return successResponse(order);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to create order", 400);
  }
}

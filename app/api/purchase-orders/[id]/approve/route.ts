import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;
  if (!["SUPER_ADMIN", "INVENTORY_MANAGER"].includes(role)) {
    return errorResponse("Only Inventory Managers or Super Admins can approve purchase orders", 403);
  }

  const { id } = await params;
  try {
    const order = await prisma.purchaseOrder.update({
      where: { id, status: { in: ["REQUESTED", "PENDING"] } },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: session!.user.id,
      },
    });
    await createAuditLog(session!.user.id, "APPROVE", "PurchaseOrder", id);
    return successResponse(order);
  } catch {
    return errorResponse("Order not found or cannot be approved", 400);
  }
}

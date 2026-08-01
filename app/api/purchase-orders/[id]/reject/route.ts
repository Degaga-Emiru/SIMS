import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  try {
    const order = await prisma.purchaseOrder.update({
      where: { id, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    await createAuditLog(session!.user.id, "REJECT", "PurchaseOrder", id);
    return successResponse(order);
  } catch {
    return errorResponse("Order not found or not pending", 400);
  }
}

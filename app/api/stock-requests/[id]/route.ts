import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["Approved", "Rejected"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!session) return errorResponse("Unauthorized", 401);

  if (session.user.role !== "SUPER_ADMIN") {
    return errorResponse("Only administrators can approve or reject stock requests", 403);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = updateStatusSchema.parse(body);

    const auditLog = await prisma.auditLog.findUnique({
      where: { id },
    });

    if (!auditLog || auditLog.entity !== "StockRequest") {
      return errorResponse("Stock request not found", 404);
    }

    const action = status === "Approved" ? "CONFIRM" : "REJECT";

    const updatedLog = await prisma.auditLog.update({
      where: { id },
      data: { action },
    });

    const details = auditLog.details as Record<string, any> | null;
    const productId = details?.productId;
    const quantity = details?.quantity ?? 0;

    let productName = "Unknown product";
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { name: true },
      });
      if (product) productName = product.name;
    }

    // Send notification to the Store Manager who requested the stock
    await prisma.notification.create({
      data: {
        userId: auditLog.userId,
        title: `Stock Request ${status}`,
        message: `Your stock request for ${quantity} units of "${productName}" has been ${status.toLowerCase()} by the Administrator.`,
        type: status === "Approved" ? "SUCCESS" : "WARNING",
      },
    });

    return successResponse({ id, status }, `Stock request has been ${status.toLowerCase()}`);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to update stock request", 400);
  }
}

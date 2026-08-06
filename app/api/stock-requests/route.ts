import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

interface StockRequestPayload {
  productId: string;
  quantity: number;
  reason: string;
  priority: string;
  notes?: string;
}

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!session) return errorResponse("Unauthorized", 401);

  try {
    const stockRequests = await prisma.auditLog.findMany({
      where: { entity: "StockRequest" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const requests = await Promise.all(
      stockRequests.map(async (request) => {
        const details = request.details as Record<string, unknown> | null;
        const productId = typeof details?.productId === "string" ? details.productId : null;
        const product = productId ? await prisma.product.findUnique({ where: { id: productId }, select: { name: true } }) : null;

        return {
          id: request.id,
          shortId: String(request.id).slice(0, 8),
          product: product?.name ?? "Unknown product",
          quantity: Number(details?.quantity ?? 0),
          reason: String(details?.reason ?? "No reason provided"),
          priority: String(details?.priority ?? "Medium"),
          notes: String(details?.notes ?? ""),
          status: request.action === "CONFIRM" ? "Approved" : request.action === "REJECT" ? "Rejected" : "Pending",
          date: request.createdAt.toISOString(),
          submittedBy: request.userId,
        };
      })
    );

    return successResponse(requests);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to fetch stock requests", 400);
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!session) return errorResponse("Unauthorized", 401);
  if (session.user.role !== "STORE_MANAGER") {
    return errorResponse("Only store managers can create stock requests", 403);
  }

  try {
    const payload = (await request.json()) as StockRequestPayload;
    if (!payload.productId || !payload.quantity || !payload.reason) {
      return errorResponse("Product, quantity, and reason are required", 400);
    }

    const product = await prisma.product.findUnique({ where: { id: payload.productId } });
    if (!product) return errorResponse("Product not found", 404);

    const requestId = `SR-${Date.now().toString().slice(-4)}`;
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "StockRequest",
        entityId: requestId,
        details: {
          requestId,
          productId: payload.productId,
          quantity: payload.quantity,
          reason: payload.reason,
          priority: payload.priority ?? "Medium",
          notes: payload.notes ?? "",
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Stock request created",
        message: `${product.name} requested for ${payload.quantity} units`,
        type: "WARNING",
      },
    });

    return successResponse({ id: requestId, status: "Pending" });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to create stock request", 400);
  }
}

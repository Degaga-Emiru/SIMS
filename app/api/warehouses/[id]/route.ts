import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { warehouseSchema } from "@/lib/validations";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: { 
      manager: { select: { name: true, email: true } },
      _count: { select: { stocks: true } } 
    },
  });

  if (!warehouse) return errorResponse("Warehouse not found", 404);
  return successResponse(warehouse);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, warehouseSchema);
  if (validationError) return validationError;

  const { id } = await params;
  try {
    const warehouse = await prisma.warehouse.update({ where: { id }, data: data! });
    await createAuditLog(session!.user.id, "UPDATE", "Warehouse", id);
    return successResponse(warehouse);
  } catch {
    return errorResponse("Warehouse not found", 404);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  try {
    await prisma.warehouse.delete({ where: { id } });
    await createAuditLog(session!.user.id, "DELETE", "Warehouse", id);
    return successResponse(null, "Warehouse deleted");
  } catch {
    return errorResponse("Warehouse not found or has stocks", 400);
  }
}

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { supplierSchema } from "@/lib/validations";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return errorResponse("Supplier not found", 404);
  return successResponse(supplier);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, supplierSchema);
  if (validationError) return validationError;

  const { id } = await params;
  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { ...data!, email: data!.email || null },
    });
    await createAuditLog(session!.user.id, "UPDATE", "Supplier", id);
    return successResponse(supplier);
  } catch {
    return errorResponse("Supplier not found", 404);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  try {
    await prisma.supplier.delete({ where: { id } });
    await createAuditLog(session!.user.id, "DELETE", "Supplier", id);
    return successResponse(null, "Supplier deleted");
  } catch {
    return errorResponse("Supplier not found", 400);
  }
}

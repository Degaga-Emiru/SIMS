import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { brandSchema } from "@/lib/validations";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const brand = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!brand) return errorResponse("Brand not found", 404);
  return successResponse(brand);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, brandSchema);
  if (validationError) return validationError;

  const { id } = await params;
  try {
    const brand = await prisma.brand.update({ where: { id }, data: data! });
    await createAuditLog(session!.user.id, "UPDATE", "Brand", id);
    return successResponse(brand);
  } catch {
    return errorResponse("Brand not found", 404);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  try {
    await prisma.brand.delete({ where: { id } });
    await createAuditLog(session!.user.id, "DELETE", "Brand", id);
    return successResponse(null, "Brand deleted");
  } catch {
    return errorResponse("Brand not found or has products", 400);
  }
}

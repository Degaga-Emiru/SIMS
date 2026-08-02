import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { canWriteProducts } from "@/lib/permissions";
import { productSchema } from "@/lib/validations";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, supplier: true },
  });
  if (!product) return errorResponse("Product not found", 404);
  return successResponse(product);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!canWriteProducts(session!.user.role)) {
    return errorResponse("You do not have permission to edit products", 403);
  }

  const { data, error: validationError } = await validateBody(request, productSchema);
  if (validationError) return validationError;

  const { id } = await params;
  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...data!,
        barcode: data!.barcode || null,
        supplierId: data!.supplierId || null,
      },
      include: { category: true, supplier: true },
    });
    await createAuditLog(session!.user.id, "UPDATE", "Product", id);
    return successResponse(product);
  } catch {
    return errorResponse("Product not found", 404);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!canWriteProducts(session!.user.role)) {
    return errorResponse("You do not have permission to delete products", 403);
  }

  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    await createAuditLog(session!.user.id, "DELETE", "Product", id);
    return successResponse(null, "Product deleted");
  } catch {
    return errorResponse("Product not found", 400);
  }
}

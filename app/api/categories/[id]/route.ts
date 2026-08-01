import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { categorySchema } from "@/lib/validations";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) return errorResponse("Category not found", 404);
  return successResponse(category);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, categorySchema);
  if (validationError) return validationError;

  const { id } = await params;
  try {
    const category = await prisma.category.update({ where: { id }, data: data! });
    await createAuditLog(session!.user.id, "UPDATE", "Category", id);
    return successResponse(category);
  } catch {
    return errorResponse("Category not found", 404);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  try {
    await prisma.category.delete({ where: { id } });
    await createAuditLog(session!.user.id, "DELETE", "Category", id);
    return successResponse(null, "Category deleted");
  } catch {
    return errorResponse("Category not found or has products", 400);
  }
}

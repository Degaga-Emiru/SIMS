import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { categorySchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { page, limit, search, sortBy, sortOrder, skip } = parsePagination(
    request.nextUrl.searchParams
  );

  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};

  const [data, total] = await Promise.all([
    prisma.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { _count: { select: { products: true } } },
    }),
    prisma.category.count({ where }),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, categorySchema);
  if (validationError) return validationError;

  try {
    const category = await prisma.category.create({ data: data! });
    await createAuditLog(session!.user.id, "CREATE", "Category", category.id);
    return successResponse(category);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to create category", 400);
  }
}

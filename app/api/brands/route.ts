import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { brandSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { page, limit, search, sortBy, sortOrder, skip } = parsePagination(
    request.nextUrl.searchParams
  );

  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};

  const [data, total] = await Promise.all([
    prisma.brand.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { _count: { select: { products: true } } },
    }),
    prisma.brand.count({ where }),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, brandSchema);
  if (validationError) return validationError;

  try {
    const brand = await prisma.brand.create({ data: data! });
    await createAuditLog(session!.user.id, "CREATE", "Brand", brand.id);
    return successResponse(brand);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to create brand", 400);
  }
}

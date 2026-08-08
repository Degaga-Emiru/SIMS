import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { warehouseSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { page, limit, search, sortBy, sortOrder, skip } = parsePagination(
    request.nextUrl.searchParams
  );

  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};

  const [data, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { 
        manager: { select: { name: true, email: true } },
        _count: { select: { stocks: true } } 
      },
    }),
    prisma.warehouse.count({ where }),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, warehouseSchema);
  if (validationError) return validationError;

  try {
    const warehouse = await prisma.warehouse.create({ data: data! });
    await createAuditLog(session!.user.id, "CREATE", "Warehouse", warehouse.id);
    return successResponse(warehouse);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to create warehouse", 400);
  }
}

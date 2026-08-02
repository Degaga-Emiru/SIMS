import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { customerSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { page, limit, search, sortBy, sortOrder, skip } = parsePagination(
    request.nextUrl.searchParams
  );

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
    prisma.customer.count({ where }),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, customerSchema);
  if (validationError) return validationError;

  const customer = await prisma.customer.create({
    data: {
      ...data!,
      email: data!.email || null,
      createdById: session!.user.id,
    },
  });
  await createAuditLog(session!.user.id, "CREATE", "Customer", customer.id);
  return successResponse(customer);
}

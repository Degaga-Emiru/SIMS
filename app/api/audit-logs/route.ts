import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, successResponse, errorResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.auditLog.count(),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const body = await request.json();
  const { ids, olderThanDays } = body as { ids?: string[]; olderThanDays?: number };

  let deletedCount = 0;

  if (ids && ids.length > 0) {
    const result = await prisma.auditLog.deleteMany({ where: { id: { in: ids } } });
    deletedCount = result.count;
  } else if (olderThanDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const result = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    deletedCount = result.count;
  } else {
    return errorResponse("Provide ids array or olderThanDays", 400);
  }

  await createAuditLog(session!.user.id, "DELETE", "AuditLog", undefined, { deletedCount, olderThanDays });
  return successResponse({ deletedCount }, `${deletedCount} log(s) deleted`);
}

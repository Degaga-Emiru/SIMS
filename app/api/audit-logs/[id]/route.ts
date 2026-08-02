import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, createAuditLog } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { id } = await params;
  try {
    await prisma.auditLog.delete({ where: { id } });
    await createAuditLog(session!.user.id, "DELETE", "AuditLog", id);
    return successResponse(null, "Audit log deleted");
  } catch {
    return errorResponse("Audit log not found", 404);
  }
}

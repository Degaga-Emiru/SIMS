import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { Role } from "@/app/generated/prisma";
import { hasPermission } from "@/types";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireRole(allowedRoles: Role[]) {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };

  if (!allowedRoles.includes(session!.user.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, error: null };
}

export async function requirePermission(permission: string) {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };

  if (!hasPermission(session!.user.role, permission)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, error: null };
}

export async function createAuditLog(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  device?: string
) {
  const { default: prisma } = await import("@/lib/prisma");
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      details: details ? (details as object) : undefined,
      ipAddress,
      device,
    },
  });
}

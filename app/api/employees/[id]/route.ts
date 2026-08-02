import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { requireRole, createAuditLog } from "@/lib/api-auth";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { employeeUpdateSchema, employeeResetPasswordSchema } from "@/lib/validations";
import { generateTemporaryPassword } from "@/lib/utils";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const employee = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      department: true,
      position: true,
      status: true,
      image: true,
      lastLogin: true,
      createdAt: true,
      forcePasswordChange: true,
    },
  });

  if (!employee) return errorResponse("Employee not found", 404);

  const recentActivities = await prisma.auditLog.findMany({
    where: { userId: id },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  return successResponse({ ...employee, recentActivities });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, employeeUpdateSchema);
  if (validationError) return validationError;

  const { id } = await params;
  if (id === session!.user.id && data?.status === "INACTIVE") {
    return errorResponse("You cannot deactivate your own account", 400);
  }

  try {
    const employee = await prisma.user.update({
      where: { id },
      data: data!,
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        position: true,
        status: true,
        image: true,
        lastLogin: true,
        createdAt: true,
      },
    });
    await createAuditLog(session!.user.id, "UPDATE", "Employee", id);
    return successResponse(employee);
  } catch {
    return errorResponse("Employee not found", 404);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { id } = await params;
  if (id === session!.user.id) return errorResponse("You cannot delete your own account", 400);

  try {
    await prisma.user.delete({ where: { id } });
    await createAuditLog(session!.user.id, "DELETE", "Employee", id);
    return successResponse(null, "Employee deleted");
  } catch {
    return errorResponse("Employee not found", 404);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const action = body.action as string;

  if (id === session!.user.id && (action === "deactivate" || action === "delete")) {
    return errorResponse("You cannot deactivate or delete your own account", 400);
  }

  if (action === "activate") {
    const employee = await prisma.user.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
    await createAuditLog(session!.user.id, "ACTIVATE", "Employee", id);
    return successResponse(employee, "Employee activated");
  }

  if (action === "deactivate") {
    const employee = await prisma.user.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    await createAuditLog(session!.user.id, "DEACTIVATE", "Employee", id);
    return successResponse(employee, "Employee deactivated");
  }

  if (action === "reset-password") {
    const parsed = employeeResetPasswordSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    let newPassword = parsed.data.password;
    if (parsed.data.generateTemporary || !newPassword) {
      newPassword = generateTemporaryPassword();
    }

    const hashed = await bcrypt.hash(newPassword!, 12);
    await prisma.user.update({
      where: { id },
      data: {
        password: hashed,
        forcePasswordChange: parsed.data.forcePasswordChange ?? true,
      },
    });
    await createAuditLog(session!.user.id, "RESET_PASSWORD", "Employee", id);
    return successResponse({ temporaryPassword: newPassword }, "Password reset successfully");
  }

  return errorResponse("Invalid action", 400);
}

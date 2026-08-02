import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { profileSchema } from "@/lib/validations";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      department: true,
      position: true,
      image: true,
      status: true,
      lastLogin: true,
      createdAt: true,
    },
  });

  return successResponse(user);
}

export async function PUT(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, profileSchema);
  if (validationError) return validationError;

  const updateData: Record<string, unknown> = {
    name: data!.name,
    phone: data!.phone || null,
    image: data!.image || null,
    forcePasswordChange: false,
  };

  if (data!.newPassword) {
    if (!data!.currentPassword) {
      return errorResponse("Current password is required", 400);
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session!.user.id } });
    const valid = await bcrypt.compare(data!.currentPassword, user.password);
    if (!valid) return errorResponse("Current password is incorrect", 400);
    updateData.password = await bcrypt.hash(data!.newPassword, 12);
  }

  const user = await prisma.user.update({
    where: { id: session!.user.id },
    data: updateData,
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      department: true,
      position: true,
      image: true,
      lastLogin: true,
      createdAt: true,
    },
  });

  return successResponse(user, "Profile updated successfully");
}

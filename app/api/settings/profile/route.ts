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
    select: { id: true, name: true, email: true, role: true, image: true, createdAt: true },
  });

  return successResponse(user);
}

export async function PUT(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, profileSchema);
  if (validationError) return validationError;

  const updateData: Record<string, string> = { name: data!.name, email: data!.email };

  if (data!.newPassword) {
    if (!data!.currentPassword) {
      return errorResponse("Current password is required", 400);
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session!.user.id } });
    const valid = await bcrypt.compare(data!.currentPassword, user.password);
    if (!valid) return errorResponse("Current password is incorrect", 400);
    updateData.password = await bcrypt.hash(data!.newPassword, 12);
  }

  try {
    const user = await prisma.user.update({
      where: { id: session!.user.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    });
    return successResponse(user);
  } catch {
    return errorResponse("Email already in use", 400);
  }
}

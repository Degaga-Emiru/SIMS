import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const notifications = await prisma.notification.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return successResponse(notifications);
}

export async function PUT(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { ids } = await request.json();
  if (ids === "all") {
    await prisma.notification.updateMany({
      where: { userId: session!.user.id, read: false },
      data: { read: true },
    });
  } else if (Array.isArray(ids)) {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId: session!.user.id },
      data: { read: true },
    });
  }

  return successResponse(null, "Notifications updated");
}

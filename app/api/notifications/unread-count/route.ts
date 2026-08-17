import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { successResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const count = await prisma.notification.count({
    where: { 
      userId: session!.user.id,
      read: false 
    },
  });

  return successResponse({ count });
}

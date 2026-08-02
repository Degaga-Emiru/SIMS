import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { settingsSchema } from "@/lib/validations";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({ data: {} });
  }

  if (session!.user.role !== "SUPER_ADMIN") {
    return successResponse({
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      taxRate: settings.taxRate,
      theme: settings.theme,
    });
  }

  return successResponse(settings);
}

export async function PUT(request: NextRequest) {
  const { session, error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, settingsSchema);
  if (validationError) return validationError;

  const existing = await prisma.companySettings.findFirst();
  const settings = existing
    ? await prisma.companySettings.update({ where: { id: existing.id }, data: data! })
    : await prisma.companySettings.create({ data: data! });

  return successResponse(settings);
}

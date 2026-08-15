import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { customerSchema } from "@/lib/validations";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        orderBy: { createdAt: "desc" },
        include: { items: { include: { product: true } } },
      },
    },
  });

  if (!customer) return errorResponse("Customer not found", 404);

  const completedSales = customer.sales.filter((s) => s.status === "COMPLETED");
  const totalSpent = completedSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const totalOrders = customer.sales.length;
  const completedOrders = completedSales.length;
  const averageOrderValue = completedOrders > 0 ? totalSpent / completedOrders : 0;

  return successResponse({
    customer,
    totalSpent,
    totalOrders,
    completedOrders,
    averageOrderValue,
    sales: customer.sales,
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, customerSchema);
  if (validationError) return validationError;

  const { id } = await params;
  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: { ...data!, email: data!.email || null },
    });
    await createAuditLog(session!.user.id, "UPDATE", "Customer", id);
    return successResponse(customer);
  } catch {
    return errorResponse("Customer not found", 404);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  try {
    await prisma.customer.delete({ where: { id } });
    await createAuditLog(session!.user.id, "DELETE", "Customer", id);
    return successResponse(null, "Customer deleted");
  } catch {
    return errorResponse("Customer not found", 400);
  }
}

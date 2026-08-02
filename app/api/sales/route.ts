import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { saleSchema } from "@/lib/validations";
import { generateOrderNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const where = session!.user.role === "SALES_MANAGER" ? { userId: session!.user.id } : {};

  const [data, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
        user: { select: { name: true } },
      },
    }),
    prisma.sale.count({ where }),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, saleSchema);
  if (validationError) return validationError;

  const subtotal = data!.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const settings = await prisma.companySettings.findFirst();
  const taxRate = Number(settings?.taxRate ?? 0);
  const taxAmount = (subtotal - data!.discount) * (taxRate / 100);
  const totalAmount = subtotal - data!.discount + taxAmount;

  try {
    const sale = await prisma.$transaction(async (tx) => {
      for (const item of data!.items) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        if (product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
      }

      const newSale = await tx.sale.create({
        data: {
          invoiceNumber: generateOrderNumber("INV"),
          subtotal,
          taxAmount,
          discount: data!.discount,
          totalAmount,
          notes: data!.notes,
          customerId: data!.customerId || null,
          userId: session!.user.id,
          status: "COMPLETED",
          items: {
            create: data!.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
          payments: {
            create: {
              amount: data!.payment.amount,
              method: data!.payment.method,
              status: "COMPLETED",
              reference: data!.payment.reference,
            },
          },
        },
        include: { customer: true, items: { include: { product: true } }, payments: true },
      });

      for (const item of data!.items) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        const newQty = product.stockQuantity - item.quantity;
        await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: newQty } });
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: "STOCK_OUT",
            quantity: item.quantity,
            previousQty: product.stockQuantity,
            newQty,
            reason: `Sale ${newSale.invoiceNumber}`,
            userId: session!.user.id,
          },
        });

        if (newQty <= product.lowStockThreshold) {
          await tx.notification.create({
            data: {
              title: "Low Stock Alert",
              message: `${product.name} is running low (${newQty} remaining)`,
              type: "LOW_STOCK",
              userId: session!.user.id,
            },
          });
        }
      }

      await tx.notification.create({
        data: {
          title: "Sale Completed",
          message: `Invoice ${newSale.invoiceNumber} for $${totalAmount.toFixed(2)}`,
          type: "SUCCESS",
          userId: session!.user.id,
        },
      });

      return newSale;
    });

    await createAuditLog(session!.user.id, "CREATE", "Sale", sale.id);
    return successResponse(sale);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to create sale", 400);
  }
}

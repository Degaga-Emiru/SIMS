import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { generateOrderNumber } from "@/lib/utils";
import { z } from "zod";

const convertSchema = z.object({
  payment: z.object({
    method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY"]),
    amount: z.coerce.number().min(0),
    reference: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  let paymentData: { method: string; amount: number; reference?: string } | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = convertSchema.safeParse(body);
    if (parsed.success) paymentData = parsed.data.payment;
  } catch { /* body is optional */ }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const quotation = await tx.sale.findUniqueOrThrow({
        where: { id },
        include: { items: { include: { product: true } } },
      });

      if (quotation.type !== "QUOTATION" && quotation.status !== "QUOTATION") {
        throw new Error("This sale is not a quotation");
      }

      // Check stock availability for all items
      for (const item of quotation.items) {
        if (item.product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product.name}`);
        }
      }

      // Deduct stock for all items
      for (const item of quotation.items) {
        const newQty = item.product.stockQuantity - item.quantity;
        await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: newQty } });
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: "STOCK_OUT",
            quantity: item.quantity,
            previousQty: item.product.stockQuantity,
            newQty,
            reason: `Quotation converted to invoice`,
            userId: session!.user.id,
          },
        });
      }

      // Convert quotation to invoice
      const updated = await tx.sale.update({
        where: { id },
        data: {
          invoiceNumber: generateOrderNumber("INV"),
          type: "INVOICE",
          status: "COMPLETED",
          ...(paymentData ? {
            payments: {
              create: {
                amount: paymentData.amount || Number(quotation.totalAmount),
                method: paymentData.method as "CASH" | "CARD" | "BANK_TRANSFER" | "MOBILE_MONEY",
                status: "COMPLETED",
                reference: paymentData.reference,
              },
            },
          } : {}),
        },
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: true,
        },
      });

      return updated;
    });

    await createAuditLog(session!.user.id, "CONVERT", "Sale", id, { from: "QUOTATION", to: "INVOICE" });
    return successResponse(sale, "Quotation converted to invoice successfully");
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Conversion failed", 400);
  }
}

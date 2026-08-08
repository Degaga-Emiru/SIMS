import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { canWriteProducts } from "@/lib/permissions";
import { productSchema } from "@/lib/validations";
import { sendNewProductEmail } from "@/lib/email-templates";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const { page, limit, search, sortBy, sortOrder, skip } = parsePagination(params);
  const categoryId = params.get("categoryId");
  const status = params.get("status");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { category: true, supplier: true, brand: true, warehouseStocks: { include: { warehouse: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!canWriteProducts(session!.user.role)) {
    return errorResponse("You do not have permission to create products", 403);
  }

  const { data, error: validationError } = await validateBody(request, productSchema);
  if (validationError) return validationError;

  try {
    const product = await prisma.product.create({
      data: {
        ...data!,
        barcode: data!.barcode || null,
        qrCode: data!.qrCode || `QR-${data!.sku}`,
        brandId: data!.brandId || null,
        supplierId: data!.supplierId || null,
      },
      include: { category: true, supplier: true, brand: true },
    });
    await createAuditLog(session!.user.id, "CREATE", "Product", product.id);

    // Notify managers
    const managers = await prisma.user.findMany({ 
      where: { role: { in: ["SUPER_ADMIN", "STORE_MANAGER", "INVENTORY_MANAGER"] } } 
    });
    for (const m of managers) {
      sendNewProductEmail(m.email, product.name, session!.user.name).catch(console.error);
    }

    return successResponse(product);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to create product", 400);
  }
}

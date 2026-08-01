import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
  const skip = (page - 1) * limit;

  return { page, limit, search, sortBy, sortOrder, skip };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return NextResponse.json({
    success: true,
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function validateBody<T>(request: Request, schema: ZodSchema<T>) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return {
        data: null,
        error: NextResponse.json(
          { success: false, error: result.error.issues[0].message },
          { status: 400 }
        ),
      };
    }
    return { data: result.data, error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }),
    };
  }
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json({ success: true, data, message });
}

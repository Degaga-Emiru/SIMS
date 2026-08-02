import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { requireRole, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { employeeCreateSchema } from "@/lib/validations";
import { generateEmployeeId } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const { page, limit, search, sortBy, sortOrder, skip } = parsePagination(params);
  const role = params.get("role");
  const status = params.get("status");
  const department = params.get("department");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { employeeId: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role;
  if (status) where.status = status;
  if (department) where.department = { contains: department, mode: "insensitive" };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        position: true,
        status: true,
        image: true,
        lastLogin: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { data, error: validationError } = await validateBody(request, employeeCreateSchema);
  if (validationError) return validationError;

  const existing = await prisma.user.findUnique({ where: { email: data!.email } });
  if (existing) return errorResponse("Email already in use", 409);

  const hashed = await bcrypt.hash(data!.password, 12);
  let employeeId = generateEmployeeId();
  while (await prisma.user.findUnique({ where: { employeeId } })) {
    employeeId = generateEmployeeId();
  }

  const employee = await prisma.user.create({
    data: {
      employeeId,
      name: data!.name,
      email: data!.email,
      phone: data!.phone || null,
      role: data!.role,
      department: data!.department || null,
      position: data!.position || null,
      password: hashed,
      image: data!.image || null,
      status: data!.status,
    },
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      department: true,
      position: true,
      status: true,
      image: true,
      createdAt: true,
    },
  });

  await createAuditLog(session!.user.id, "CREATE", "Employee", employee.id, { name: employee.name });
  return successResponse(employee, "Employee created successfully");
}

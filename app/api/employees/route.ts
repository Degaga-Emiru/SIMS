import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { requireRole, createAuditLog } from "@/lib/api-auth";
import { parsePagination, paginatedResponse, validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { employeeCreateSchema } from "@/lib/validations";
import { generateEmployeeId } from "@/lib/utils";
import { sendEmail } from "@/lib/mailer";

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
      forcePasswordChange: true, // Force password change on first login
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

  // Dispatch welcome email with credentials
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const welcomeHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #16a34a; margin: 0;">Smart Inventory Management System</h2>
        <p style="color: #666; margin: 5px 0 0 0;">Welcome to the Team!</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p>Hello <strong>${employee.name}</strong>,</p>
      <p>Your employee account has been created by the Administrator. Below are your login credentials to access the system:</p>
      
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 20px 0; font-family: monospace; font-size: 14px;">
        <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${appUrl}/login" style="color: #16a34a; text-decoration: underline;">${appUrl}/login</a></p>
        <p style="margin: 5px 0;"><strong>Email Address:</strong> ${employee.email}</p>
        <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${data!.password}</p>
      </div>
      
      <p style="color: #ea580c; font-weight: 500;">Please note: For security reasons, you will be required to change this temporary password immediately after your first login.</p>
      <p>If you have any questions or did not expect this account setup, please reach out to your administrator.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #999; text-align: center;">This is an automated system message. Please do not reply directly to this email.</p>
    </div>
  `;

  try {
    await sendEmail({
      to: employee.email,
      subject: "Welcome to SIMS - Your Account Credentials",
      html: welcomeHtml,
    });
  } catch (emailErr) {
    console.error("Failed to send welcome credentials email:", emailErr);
  }

  await createAuditLog(session!.user.id, "CREATE", "Employee", employee.id, { name: employee.name });
  return successResponse(employee, "Employee created successfully");
}

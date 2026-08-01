import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { validateBody, errorResponse, successResponse } from "@/lib/api-utils";

export async function POST(request: Request) {
  const { data, error } = await validateBody(request, registerSchema);
  if (error) return error;

  const { name, email, password, role } = data!;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return errorResponse("Email already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role ?? "SALES_STAFF",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return successResponse(user, "Account created successfully");
}

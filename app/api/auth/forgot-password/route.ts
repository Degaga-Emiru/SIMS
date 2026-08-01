import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { validateBody, successResponse } from "@/lib/api-utils";

const SUCCESS_MESSAGE =
  "If an account with that email exists, a password reset link has been sent.";

export async function POST(request: Request) {
  const { data, error } = await validateBody(request, forgotPasswordSchema);
  if (error) return error;

  const { email } = data!;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordResetToken.create({
      data: {
        token: uuidv4(),
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  }

  return successResponse(null, SUCCESS_MESSAGE);
}

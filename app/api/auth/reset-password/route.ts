import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";
import { validateBody, errorResponse, successResponse } from "@/lib/api-utils";
import { sendPasswordResetSuccessEmail } from "@/lib/email-templates";

export async function POST(request: Request) {
  const { data, error } = await validateBody(request, resetPasswordSchema);
  if (error) return error;

  const { token, password } = data!;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken) {
    return errorResponse("Invalid or expired reset token", 400);
  }

  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });
    return errorResponse("Invalid or expired reset token", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    }),
  ]);

  sendPasswordResetSuccessEmail(resetToken.user.email, resetToken.user.name).catch(console.error);

  return successResponse(null, "Password reset successfully");
}

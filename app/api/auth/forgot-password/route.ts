import prisma from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { validateBody, successResponse } from "@/lib/api-utils";
import { sendEmail } from "@/lib/mailer";

const SUCCESS_MESSAGE =
  "A 6-digit verification code has been sent to your email if an account exists.";

export async function POST(request: Request) {
  const { data, error } = await validateBody(request, forgotPasswordSchema);
  if (error) return error;

  const { email } = data!;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    // Delete any existing password reset tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.passwordResetToken.create({
      data: {
        token: otp,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send the OTP email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #16a34a; margin: 0;">Smart Inventory Management System</h2>
          <p style="color: #666; margin: 5px 0 0 0;">Password Reset Verification</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p>Hello ${user.name},</p>
        <p>We received a request to reset the password for your SIMS account. Please use the following 6-digit verification code (OTP) to proceed:</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #16a34a; margin: 25px 0;">
          ${otp}
        </div>
        <p style="color: #ef4444; font-size: 13px; font-weight: 500;">This verification code is valid for 1 hour. Do not share this code with anyone.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Verification Code - SIMS",
        html: emailHtml,
      });
    } catch (mailError) {
      console.error("Failed to send OTP email:", mailError);
    }
  }

  return successResponse(null, SUCCESS_MESSAGE);
}

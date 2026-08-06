import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  // Gracefully fallback if mail service is not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn("SMTP credentials are not configured in .env. Email was NOT sent to:", to);
    console.log("Email Subject:", subject);
    console.log("Email HTML Content preview:", html.slice(0, 300) + "...");
    return null;
  }

  const from = process.env.SMTP_FROM || `"SIMS Admin" <${process.env.SMTP_USER}>`;

  return transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}

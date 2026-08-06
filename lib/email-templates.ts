import { sendEmail } from "./mailer";

export async function sendLowStockEmail(to: string, productName: string, currentStock: number, minStock: number) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #ef4444; margin-bottom: 20px;">Low Stock Alert</h2>
      <p style="color: #334155; font-size: 16px;">Hello,</p>
      <p style="color: #334155; font-size: 16px;">The product <strong>${productName}</strong> is running low on stock.</p>
      <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <ul style="color: #991b1b; list-style-type: none; padding: 0; margin: 0;">
          <li style="margin-bottom: 8px;">Current Stock: <strong>${currentStock}</strong></li>
          <li>Minimum Threshold: <strong>${minStock}</strong></li>
        </ul>
      </div>
      <p style="color: #334155; font-size: 16px;">Please restock this item as soon as possible.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">This is an automated notification from your Inventory Management System.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Low Stock Alert: ${productName}`,
    html,
  });
}

export async function sendNewProductEmail(to: string, productName: string, createdBy: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">New Product Added</h2>
      <p style="color: #334155; font-size: 16px;">Hello,</p>
      <p style="color: #334155; font-size: 16px;">A new product <strong>${productName}</strong> has been added to the inventory system by ${createdBy}.</p>
      <p style="color: #334155; font-size: 16px;">You can view the product details in the dashboard.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">This is an automated notification from your Inventory Management System.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `New Product Added: ${productName}`,
    html,
  });
}

export async function sendPasswordResetSuccessEmail(to: string, name: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #16a34a; margin-bottom: 20px;">Password Reset Successful</h2>
      <p style="color: #334155; font-size: 16px;">Hello ${name},</p>
      <p style="color: #334155; font-size: 16px;">Your password has been successfully reset. You can now log in with your new password.</p>
      <p style="color: #334155; font-size: 16px;">If you did not request this change, please contact an administrator immediately.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">This is an automated notification from your Inventory Management System.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: "Password Reset Successful",
    html,
  });
}

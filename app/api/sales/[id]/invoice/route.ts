import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { errorResponse } from "@/lib/api-utils";

function formatMoney(val: any): string {
  const n = Number(val?.toString() ?? val ?? 0);
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pad(v: string | number, len = 2) {
  return String(v).padStart(len, "0");
}

function formatDate(d: Date | string) {
  const dt = new Date(d);
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: { product: { select: { name: true, sku: true, unit: true } } },
      },
      payments: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!sale) return errorResponse("Sale not found", 404);

  const settings = await prisma.companySettings.findFirst();
  const company = settings?.companyName ?? "Smart IMS";
  const companyAddress = settings?.address ?? "";
  const companyEmail = settings?.email ?? "";
  const companyPhone = settings?.phone ?? "";

  const statusColor: Record<string, string> = {
    COMPLETED: "#16a34a",
    PENDING: "#d97706",
    CANCELLED: "#dc2626",
    REFUNDED: "#7c3aed",
    QUOTATION: "#2563eb",
  };
  const statusBg: Record<string, string> = {
    COMPLETED: "#dcfce7",
    PENDING: "#fef3c7",
    CANCELLED: "#fee2e2",
    REFUNDED: "#ede9fe",
    QUOTATION: "#dbeafe",
  };

  const subtotal = Number(sale.subtotal);
  const discount = Number(sale.discount);
  const taxAmount = Number(sale.taxAmount);
  const total = Number(sale.totalAmount);
  const paid = sale.payments.reduce((s, p) => s + Number(p.amount), 0);
  const due = total - paid;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${sale.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 13px; }
    .page { max-width: 860px; margin: 0 auto; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .company-name { font-size: 26px; font-weight: 800; color: #16a34a; letter-spacing: -0.5px; }
    .company-info { font-size: 12px; color: #6b7280; line-height: 1.7; margin-top: 6px; }
    .invoice-meta { text-align: right; }
    .invoice-title { font-size: 32px; font-weight: 900; color: #111827; letter-spacing: -1px; }
    .invoice-number { font-size: 14px; color: #6b7280; margin-top: 4px; font-family: monospace; }
    .status-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; background: ${statusBg[sale.status] ?? "#f3f4f6"}; color: ${statusColor[sale.status] ?? "#374151"}; }
    .divider { height: 2px; background: linear-gradient(to right, #16a34a, #4ade80, transparent); margin: 32px 0; border-radius: 2px; }
    .bill-section { display: flex; gap: 48px; margin-bottom: 32px; }
    .bill-box { flex: 1; }
    .bill-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 8px; }
    .bill-name { font-size: 15px; font-weight: 700; color: #111827; }
    .bill-detail { font-size: 12px; color: #6b7280; line-height: 1.6; margin-top: 2px; }
    .dates-section { display: flex; gap: 24px; margin-bottom: 32px; }
    .date-box { background: #f9fafb; border-radius: 10px; padding: 14px 20px; }
    .date-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 4px; }
    .date-value { font-size: 14px; font-weight: 600; color: #111827; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #111827; color: #fff; }
    thead th { padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:last-child { text-align: right; }
    tbody tr { border-bottom: 1px solid #f3f4f6; }
    tbody tr:hover { background: #f9fafb; }
    tbody td { padding: 13px 14px; font-size: 13px; }
    tbody td:last-child { text-align: right; font-weight: 600; }
    .sku { font-size: 11px; color: #9ca3af; font-family: monospace; margin-top: 2px; }
    .totals { margin-top: 24px; display: flex; justify-content: flex-end; }
    .totals-table { width: 320px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .totals-row.total { border-bottom: none; border-top: 2px solid #111827; margin-top: 8px; padding-top: 12px; font-size: 17px; font-weight: 800; color: #111827; }
    .totals-row.due { color: ${due > 0 ? "#dc2626" : "#16a34a"}; font-weight: 700; font-size: 14px; }
    .payments-section { margin-top: 32px; }
    .payments-title { font-size: 13px; font-weight: 700; margin-bottom: 10px; color: #374151; }
    .payment-item { display: flex; justify-content: space-between; background: #f9fafb; border-radius: 8px; padding: 10px 16px; margin-bottom: 6px; font-size: 12px; }
    .footer { margin-top: 48px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #f3f4f6; padding-top: 24px; }
    .footer strong { color: #6b7280; }
    @media print {
      .page { padding: 24px; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    @page { margin: 15mm; }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">${company}</div>
      <div class="company-info">
        ${companyAddress ? `${companyAddress}<br/>` : ""}
        ${companyEmail ? `${companyEmail}<br/>` : ""}
        ${companyPhone ? `Tel: ${companyPhone}` : ""}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">${sale.type === "QUOTATION" ? "QUOTATION" : "INVOICE"}</div>
      <div class="invoice-number">#${sale.invoiceNumber}</div>
      <div><span class="status-badge">${sale.status}</span></div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Bill To / From -->
  <div class="bill-section">
    <div class="bill-box">
      <div class="bill-label">Bill To</div>
      ${sale.customer
        ? `<div class="bill-name">${sale.customer.name}</div>
           <div class="bill-detail">${sale.customer.email ?? ""}${sale.customer.phone ? `<br/>${sale.customer.phone}` : ""}${sale.customer.address ? `<br/>${sale.customer.address}` : ""}</div>`
        : `<div class="bill-name">Walk-in Customer</div>`}
    </div>
    <div class="bill-box">
      <div class="bill-label">Prepared By</div>
      <div class="bill-name">${sale.user.name}</div>
      <div class="bill-detail">${sale.user.email ?? ""}</div>
    </div>
  </div>

  <!-- Dates -->
  <div class="dates-section">
    <div class="date-box">
      <div class="date-label">Issue Date</div>
      <div class="date-value">${formatDate(sale.createdAt)}</div>
    </div>
    ${sale.type !== "QUOTATION"
      ? `<div class="date-box">
           <div class="date-label">Due Date</div>
           <div class="date-value">${formatDate(new Date(new Date(sale.createdAt).getTime() + 30 * 86400000))}</div>
         </div>`
      : ""}
    <div class="date-box">
      <div class="date-label">Payment Status</div>
      <div class="date-value" style="color:${due <= 0 ? "#16a34a" : "#dc2626"}">${due <= 0 ? "PAID IN FULL" : `DUE: ${formatMoney(due)}`}</div>
    </div>
  </div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>Unit</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${sale.items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>
            ${item.product.name}
            <div class="sku">SKU: ${item.product.sku}</div>
          </td>
          <td>${item.product.unit ?? "—"}</td>
          <td style="text-align:right">${item.quantity}</td>
          <td style="text-align:right">${formatMoney(item.unitPrice)}</td>
          <td style="text-align:right">${formatMoney(item.totalPrice)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-table">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatMoney(subtotal)}</span>
      </div>
      ${discount > 0 ? `
      <div class="totals-row" style="color:#16a34a">
        <span>Discount</span>
        <span>-${formatMoney(discount)}</span>
      </div>` : ""}
      ${taxAmount > 0 ? `
      <div class="totals-row">
        <span>Tax</span>
        <span>${formatMoney(taxAmount)}</span>
      </div>` : ""}
      <div class="totals-row total">
        <span>TOTAL</span>
        <span>${formatMoney(total)}</span>
      </div>
      ${paid > 0 ? `
      <div class="totals-row" style="color:#16a34a">
        <span>Paid</span>
        <span>-${formatMoney(paid)}</span>
      </div>` : ""}
      ${due > 0 ? `
      <div class="totals-row due">
        <span>Balance Due</span>
        <span>${formatMoney(due)}</span>
      </div>` : ""}
    </div>
  </div>

  <!-- Payment History -->
  ${sale.payments.length > 0 ? `
  <div class="payments-section">
    <div class="payments-title">Payment History</div>
    ${sale.payments.map(p => `
      <div class="payment-item">
        <span>${p.method.replace("_", " ")} ${p.reference ? `— Ref: ${p.reference}` : ""}</span>
        <span style="font-weight:700;color:#16a34a">${formatMoney(p.amount)}</span>
      </div>
    `).join("")}
  </div>` : ""}

  <!-- Notes -->
  ${sale.notes ? `
  <div style="margin-top:24px; background:#f9fafb; border-left:3px solid #16a34a; padding:12px 16px; border-radius:0 8px 8px 0;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;margin-bottom:4px;">Notes</div>
    <div style="font-size:13px;color:#374151;">${sale.notes}</div>
  </div>` : ""}

  <!-- Footer -->
  <div class="footer">
    <strong>Thank you for your business!</strong><br/>
    ${company} &bull; Generated on ${formatDate(new Date())} &bull; ${sale.invoiceNumber}
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="invoice-${sale.invoiceNumber}.html"`,
    },
  });
}

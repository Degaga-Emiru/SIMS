import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface GenerateInvoicePDFOptions {
  type: "sale" | "purchase";
  documentNumber: string;
  date: string;
  partyName: string;
  partyLabel: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount?: number;
  discount?: number;
  totalAmount: number;
  companyName?: string;
}

export function generateInvoicePDF({
  type,
  documentNumber,
  date,
  partyName,
  partyLabel,
  items,
  subtotal,
  taxAmount = 0,
  discount = 0,
  totalAmount,
  companyName = "Smart Inventory Management System",
}: GenerateInvoicePDFOptions) {
  const doc = new jsPDF();
  const title = type === "sale" ? "Sales Invoice" : "Purchase Order";

  doc.setFontSize(18);
  doc.setTextColor(22, 163, 74);
  doc.text(companyName, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(title, 14, 28);
  doc.text(`#${documentNumber}`, 14, 34);
  doc.text(formatDate(date), 14, 40);

  doc.text(`${partyLabel}: ${partyName}`, 14, 50);

  autoTable(doc, {
    startY: 58,
    head: [["Item", "Qty", "Unit Price", "Total"]],
    body: items.map((i) => [
      i.name,
      i.quantity.toString(),
      formatCurrency(i.unitPrice),
      formatCurrency(i.totalPrice),
    ]),
    headStyles: { fillColor: [22, 163, 74] },
    styles: { fontSize: 9 },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.text(`Subtotal: ${formatCurrency(subtotal)}`, 140, finalY);
  if (discount > 0) doc.text(`Discount: -${formatCurrency(discount)}`, 140, finalY + 6);
  if (taxAmount > 0) doc.text(`Tax: ${formatCurrency(taxAmount)}`, 140, finalY + 12);
  doc.setFontSize(12);
  doc.setTextColor(22, 163, 74);
  doc.text(`Total: ${formatCurrency(totalAmount)}`, 140, finalY + (taxAmount > 0 ? 20 : 12));

  doc.save(`${documentNumber}.pdf`);
}

export function printInvoice(elementId: string) {
  const content = document.getElementById(elementId);
  if (!content) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html><head><title>Invoice</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 40px; color: #111; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; }
      th { background: #f0fdf4; }
      .total { font-weight: bold; color: #16a34a; font-size: 1.1em; }
      .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
    </style></head><body>${content.innerHTML}</body></html>
  `);
  win.document.close();
  win.print();
}

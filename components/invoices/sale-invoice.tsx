"use client";

import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface SaleInvoiceProps {
  invoiceNumber: string;
  date: string;
  customer?: string | null;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  companyName?: string;
  paymentMethod?: string;
  onPrint?: () => void;
  onDownload?: () => void;
}

export function SaleInvoice({
  invoiceNumber,
  date,
  customer,
  items,
  subtotal,
  taxAmount,
  discount,
  totalAmount,
  companyName = "Smart Inventory Management System",
  paymentMethod,
  onPrint,
  onDownload,
}: SaleInvoiceProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        {onPrint && (
          <Button variant="outline" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        )}
        {onDownload && (
          <Button onClick={onDownload}>
            <Download className="h-4 w-4 mr-1" /> Download PDF
          </Button>
        )}
      </div>

      <Card id="invoice-print" className="print:shadow-none print:border-none">
        <CardContent className="p-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary">{companyName}</h2>
              <p className="text-sm text-muted-foreground mt-1">Sales Invoice / Receipt</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-lg">{invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Bill To</p>
              <p className="font-medium">{customer ?? "Walk-in Customer"}</p>
            </div>
            {paymentMethod && (
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground uppercase">Payment</p>
                <p className="font-medium">{paymentMethod.replace("_", " ")}</p>
              </div>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Item</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2">{item.name}</td>
                  <td className="text-right py-2">{item.quantity}</td>
                  <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right py-2">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Thank you for your business!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

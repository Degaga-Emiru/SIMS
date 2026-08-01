"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DashboardLoading } from "@/components/dashboard/loading";
import { generateInvoicePDF, printInvoice } from "@/lib/invoice-pdf";
import { formatCurrency, formatDate } from "@/lib/utils";
import api from "@/lib/api";

interface PODetail {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  notes: string | null;
  supplier: { name: string; email: string | null; phone: string | null };
  items: { quantity: number; unitPrice: string; totalPrice: string; product: { name: string } }[];
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<PODetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: PODetail }>(`/purchase-orders/${id}`).then((res) => {
      setOrder(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <DashboardLoading />;
  if (!order) return <p className="text-muted-foreground">Purchase order not found.</p>;

  const items = order.items.map((i) => ({
    name: i.product.name,
    quantity: i.quantity,
    unitPrice: Number(i.unitPrice),
    totalPrice: Number(i.totalPrice),
  }));

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={() => printInvoice("po-invoice")}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
        <Button
          onClick={() =>
            generateInvoicePDF({
              type: "purchase",
              documentNumber: order.orderNumber,
              date: order.createdAt,
              partyName: order.supplier.name,
              partyLabel: "Supplier",
              items,
              subtotal: Number(order.totalAmount),
              totalAmount: Number(order.totalAmount),
            })
          }
        >
          <Download className="h-4 w-4 mr-1" /> Download PDF
        </Button>
      </div>

      <Card id="po-invoice">
        <CardContent className="p-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary">Purchase Order</h2>
              <p className="font-mono font-bold mt-2">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <Badge>{order.status}</Badge>
              <p className="text-sm text-muted-foreground mt-2">{formatDate(order.createdAt)}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="mb-6">
            <p className="text-xs font-medium text-muted-foreground uppercase">Supplier</p>
            <p className="font-medium">{order.supplier.name}</p>
            {order.supplier.email && <p className="text-sm text-muted-foreground">{order.supplier.email}</p>}
            {order.supplier.phone && <p className="text-sm text-muted-foreground">{order.supplier.phone}</p>}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Unit Price</th>
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
            <p className="text-lg font-bold text-primary">
              Total: {formatCurrency(Number(order.totalAmount))}
            </p>
          </div>

          {order.notes && (
            <p className="mt-4 text-sm text-muted-foreground">Notes: {order.notes}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

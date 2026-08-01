"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaleInvoice } from "@/components/invoices/sale-invoice";
import { generateInvoicePDF, printInvoice } from "@/lib/invoice-pdf";
import { DashboardLoading } from "@/components/dashboard/loading";
import api from "@/lib/api";

interface SaleDetail {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  subtotal: string;
  taxAmount: string;
  discount: string;
  totalAmount: string;
  customer: { name: string } | null;
  items: { quantity: number; unitPrice: string; totalPrice: string; product: { name: string } }[];
  payments: { method: string }[];
}

export default function SaleInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: SaleDetail }>(`/sales/${id}`).then((res) => {
      setSale(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <DashboardLoading />;
  if (!sale) return <p className="text-muted-foreground">Sale not found.</p>;

  const items = sale.items.map((i) => ({
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

      <SaleInvoice
        invoiceNumber={sale.invoiceNumber}
        date={sale.createdAt}
        customer={sale.customer?.name}
        items={items}
        subtotal={Number(sale.subtotal)}
        taxAmount={Number(sale.taxAmount)}
        discount={Number(sale.discount)}
        totalAmount={Number(sale.totalAmount)}
        paymentMethod={sale.payments[0]?.method}
        onPrint={() => printInvoice("invoice-print")}
        onDownload={() =>
          generateInvoicePDF({
            type: "sale",
            documentNumber: sale.invoiceNumber,
            date: sale.createdAt,
            partyName: sale.customer?.name ?? "Walk-in Customer",
            partyLabel: "Customer",
            items,
            subtotal: Number(sale.subtotal),
            taxAmount: Number(sale.taxAmount),
            discount: Number(sale.discount),
            totalAmount: Number(sale.totalAmount),
          })
        }
      />
    </div>
  );
}

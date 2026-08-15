"use client";

import { useState } from "react";
import { Eye, Printer, Search, Receipt, Download } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SaleInvoice } from "@/components/invoices/sale-invoice";
import { usePaginatedApi } from "@/lib/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToPDF } from "@/lib/export";

interface InvoiceSale {
  id: string;
  invoiceNumber: string;
  subtotal: string;
  taxAmount: string;
  discount: string;
  totalAmount: string;
  status: string;
  type: string;
  createdAt: string;
  customer: { id: string; name: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    product: { name: string };
  }>;
  payments: Array<{
    amount: string;
    method: string;
    status: string;
  }>;
}

export default function InvoicesPage() {
  const { data, loading, page, setPage, totalPages, search, setSearch, refetch } =
    usePaginatedApi<InvoiceSale>("/sales");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSale | null>(null);

  const completedInvoices = data.filter((s) => s.status === "COMPLETED" || s.type === "INVOICE");
  const pendingInvoices = data.filter((s) => s.status === "PENDING");
  const refundedInvoices = data.filter((s) => s.status === "REFUNDED" || s.status === "CANCELLED");

  function handlePrint() {
    window.print();
  }

  function handleDownloadPDF(inv: InvoiceSale) {
    const exportData = inv.items.map((item) => ({
      Product: item.product.name,
      Quantity: item.quantity,
      "Unit Price": formatCurrency(Number(item.unitPrice)),
      Total: formatCurrency(Number(item.totalPrice)),
    }));
    const columns = [
      { key: "Product", header: "Product" },
      { key: "Quantity", header: "Qty" },
      { key: "Unit Price", header: "Unit Price" },
      { key: "Total", header: "Total Price" },
    ];
    exportToPDF(
      exportData,
      columns,
      `Invoice-${inv.invoiceNumber}`,
      `Sales Invoice: ${inv.invoiceNumber} (Total: ${formatCurrency(Number(inv.totalAmount))})`
    );
    toast.success(`Exported Invoice ${inv.invoiceNumber} as PDF`);
  }

  const columns = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      render: (r: InvoiceSale) => (
        <div className="flex items-center gap-2 font-mono font-medium text-primary">
          <Receipt className="h-4 w-4 opacity-70" />
          <button
            onClick={() => setSelectedInvoice(r)}
            className="hover:underline text-left font-bold"
          >
            {r.invoiceNumber}
          </button>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (r: InvoiceSale) => r.customer?.name ?? "Walk-in Customer",
    },
    {
      key: "totalAmount",
      header: "Amount",
      render: (r: InvoiceSale) => (
        <span className="font-bold text-foreground">
          {formatCurrency(Number(r.totalAmount))}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (r: InvoiceSale) => formatDate(r.createdAt),
    },
    {
      key: "status",
      header: "Payment Status",
      render: (r: InvoiceSale) => (
        <Badge
          variant={
            r.status === "COMPLETED"
              ? "success"
              : r.status === "PENDING"
              ? "secondary"
              : "destructive"
          }
        >
          {r.status === "COMPLETED" ? "Paid" : r.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r: InvoiceSale) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedInvoice(r)}
            title="View Invoice"
          >
            <Eye className="h-4 w-4 mr-1 text-primary" /> View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownloadPDF(r)}
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage and print confirmed sales invoices, receipts, and payment records"
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice # or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Invoices ({data.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid / Completed ({completedInvoices.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingInvoices.length})</TabsTrigger>
          <TabsTrigger value="refunded">Cancelled / Refunded ({refundedInvoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          <DataTable
            columns={columns}
            data={completedInvoices}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            emptyMessage="No paid invoices found"
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            columns={columns}
            data={pendingInvoices}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            emptyMessage="No pending invoices found"
          />
        </TabsContent>

        <TabsContent value="refunded" className="mt-4">
          <DataTable
            columns={columns}
            data={refundedInvoices}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            emptyMessage="No refunded invoices found"
          />
        </TabsContent>
      </Tabs>

      {/* Invoice Viewer Modal */}
      <Dialog open={!!selectedInvoice} onOpenChange={(o) => !o && setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Sales Invoice #{selectedInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <SaleInvoice
              invoiceNumber={selectedInvoice.invoiceNumber}
              date={selectedInvoice.createdAt}
              customer={selectedInvoice.customer?.name}
              items={selectedInvoice.items.map((i) => ({
                name: i.product.name,
                quantity: i.quantity,
                unitPrice: Number(i.unitPrice),
                totalPrice: Number(i.totalPrice),
              }))}
              subtotal={Number(selectedInvoice.subtotal)}
              taxAmount={Number(selectedInvoice.taxAmount)}
              discount={Number(selectedInvoice.discount)}
              totalAmount={Number(selectedInvoice.totalAmount)}
              paymentMethod={selectedInvoice.payments?.[0]?.method}
              onPrint={handlePrint}
              onDownload={() => handleDownloadPDF(selectedInvoice)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

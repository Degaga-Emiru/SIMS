"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShoppingBag, Eye, CheckCircle2, XCircle, Search, Receipt } from "lucide-react";
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
import api from "@/lib/api";

interface SaleOrder {
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

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  const [activeTab, setActiveTab] = useState(initialStatus.toLowerCase());

  const { data, loading, page, setPage, totalPages, search, setSearch, refetch } =
    usePaginatedApi<SaleOrder>("/sales");
  const [viewingOrder, setViewingOrder] = useState<SaleOrder | null>(null);
  const [processing, setProcessing] = useState(false);

  const pendingOrders = data.filter((o) => o.status === "PENDING" || o.status === "QUOTATION");
  const completedOrders = data.filter((o) => o.status === "COMPLETED");
  const cancelledOrders = data.filter((o) => o.status === "CANCELLED" || o.status === "REFUNDED");

  async function handleConfirmSale(orderId: string) {
    if (!confirm("Confirm this order and convert to final sale? This will automatically deduct inventory stock and issue an invoice.")) {
      return;
    }
    setProcessing(true);
    try {
      await api.put(`/sales/${orderId}`, { status: "COMPLETED", type: "INVOICE" });
      toast.success("Order confirmed, inventory deducted, invoice generated!");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm sale order");
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancelOrder(orderId: string) {
    if (!confirm("Cancel this order?")) return;
    setProcessing(true);
    try {
      await api.put(`/sales/${orderId}`, { status: "CANCELLED" });
      toast.success("Order cancelled");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setProcessing(false);
    }
  }

  const columns = [
    {
      key: "invoiceNumber",
      header: "Order / Invoice #",
      render: (r: SaleOrder) => (
        <div className="flex items-center gap-2 font-mono font-medium text-primary">
          <ShoppingBag className="h-4 w-4 opacity-70" />
          <button onClick={() => setViewingOrder(r)} className="hover:underline text-left font-bold">
            {r.invoiceNumber}
          </button>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (r: SaleOrder) => r.customer?.name ?? "Walk-in Customer",
    },
    {
      key: "items",
      header: "Items Qty",
      render: (r: SaleOrder) => (
        <span className="text-xs font-medium text-muted-foreground">
          {r.items.reduce((acc, i) => acc + i.quantity, 0)} pcs ({r.items.length} products)
        </span>
      ),
    },
    {
      key: "totalAmount",
      header: "Total",
      render: (r: SaleOrder) => (
        <span className="font-bold text-foreground">{formatCurrency(Number(r.totalAmount))}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (r: SaleOrder) => formatDate(r.createdAt),
    },
    {
      key: "status",
      header: "Status",
      render: (r: SaleOrder) => (
        <Badge
          variant={
            r.status === "COMPLETED"
              ? "success"
              : r.status === "PENDING"
              ? "secondary"
              : "destructive"
          }
        >
          {r.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r: SaleOrder) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setViewingOrder(r)} title="View Order Details">
            <Eye className="h-4 w-4 text-primary" />
          </Button>

          {r.status === "PENDING" && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleConfirmSale(r.id)}
                disabled={processing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm Sale
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCancelOrder(r.id)}
                disabled={processing}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders Management"
        description="Track, confirm, process, and manage customer orders across all order stages"
        action={
          <Button asChild>
            <Link href="/dashboard/sales/new">Create New Order</Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders by number or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Orders ({data.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelledOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DataTable columns={columns} data={data} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <DataTable columns={columns} data={pendingOrders} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} emptyMessage="No pending orders" />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <DataTable columns={columns} data={completedOrders} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} emptyMessage="No completed orders" />
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4">
          <DataTable columns={columns} data={cancelledOrders} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} emptyMessage="No cancelled orders" />
        </TabsContent>
      </Tabs>

      {/* Order / Invoice Modal */}
      <Dialog open={!!viewingOrder} onOpenChange={(o) => !o && setViewingOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Order / Invoice Details #{viewingOrder?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>

          {viewingOrder && (
            <SaleInvoice
              invoiceNumber={viewingOrder.invoiceNumber}
              date={viewingOrder.createdAt}
              customer={viewingOrder.customer?.name}
              items={viewingOrder.items.map((i) => ({
                name: i.product.name,
                quantity: i.quantity,
                unitPrice: Number(i.unitPrice),
                totalPrice: Number(i.totalPrice),
              }))}
              subtotal={Number(viewingOrder.subtotal)}
              taxAmount={Number(viewingOrder.taxAmount)}
              discount={Number(viewingOrder.discount)}
              totalAmount={Number(viewingOrder.totalAmount)}
              paymentMethod={viewingOrder.payments?.[0]?.method}
              onPrint={() => window.print()}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

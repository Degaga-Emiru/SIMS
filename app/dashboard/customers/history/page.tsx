"use client";

import { useState } from "react";
import { Users, ShoppingBag, DollarSign, Calendar, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePaginatedApi, useApiData } from "@/lib/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  status: string;
  createdAt: string;
  sales?: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    status: string;
    createdAt: string;
  }>;
}

interface CustomerHistoryDetail {
  customer: Customer;
  totalSpent: number;
  totalOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  sales: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    status: string;
    type: string;
    createdAt: string;
    items: Array<{
      quantity: number;
      unitPrice: string;
      totalPrice: string;
      product: { name: string };
    }>;
  }>;
}

export default function CustomerHistoryPage() {
  const { data, loading, page, setPage, totalPages, search, setSearch } =
    usePaginatedApi<Customer>("/customers");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const { data: customerHistory, loading: historyLoading } = useApiData<CustomerHistoryDetail>(
    selectedCustomerId ? `/customers/${selectedCustomerId}` : null
  );

  const columns = [
    {
      key: "name",
      header: "Customer Name",
      render: (r: Customer) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
            {r.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <button
              onClick={() => setSelectedCustomerId(r.id)}
              className="font-medium text-foreground hover:text-primary hover:underline text-left"
            >
              {r.name}
            </button>
            <p className="text-xs text-muted-foreground">{r.email ?? r.phone ?? "No contact info"}</p>
          </div>
        </div>
      ),
    },
    { key: "city", header: "City / Location", render: (r: Customer) => r.city ?? r.country ?? "—" },
    { key: "phone", header: "Phone", render: (r: Customer) => r.phone ?? "—" },
    { key: "createdAt", header: "Customer Since", render: (r: Customer) => formatDate(r.createdAt) },
    {
      key: "status",
      header: "Status",
      render: (r: Customer) => <Badge variant={r.status === "ACTIVE" ? "success" : "secondary"}>{r.status}</Badge>,
    },
    {
      key: "actions",
      header: "Action",
      render: (r: Customer) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedCustomerId(r.id)}>
          View History <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Purchase History"
        description="Comprehensive purchasing log, customer lifetime value analytics, and invoice history"
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/customers">Manage Customers</Link>
          </Button>
        }
      />

      <Input
        placeholder="Search customer history by name, phone, or email..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      <DataTable columns={columns} data={data} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Detailed Customer History Modal */}
      <Dialog open={!!selectedCustomerId} onOpenChange={(o) => !o && setSelectedCustomerId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" />
              Customer History Details
            </DialogTitle>
          </DialogHeader>

          {historyLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading customer history records...</p>
          ) : customerHistory ? (
            <div className="space-y-6 py-2">
              {/* Customer Header Info */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 border-b pb-4">
                <div>
                  <h3 className="text-xl font-bold">{customerHistory.customer.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {customerHistory.customer.email} {customerHistory.customer.phone && `• ${customerHistory.customer.phone}`}
                  </p>
                  {customerHistory.customer.city && (
                    <p className="text-xs text-muted-foreground mt-0.5">{customerHistory.customer.city}, {customerHistory.customer.country}</p>
                  )}
                </div>
                <Badge variant={customerHistory.customer.status === "ACTIVE" ? "success" : "secondary"}>
                  {customerHistory.customer.status}
                </Badge>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Lifetime Spend</p>
                  <p className="text-xl font-bold text-primary mt-1">
                    {formatCurrency(customerHistory.totalSpent ?? 0)}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Total Orders</p>
                  <p className="text-xl font-bold mt-1">{customerHistory.totalOrders ?? 0}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Completed</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{customerHistory.completedOrders ?? 0}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Avg Order Value</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(customerHistory.averageOrderValue ?? 0)}</p>
                </Card>
              </div>

              {/* Purchase History Table */}
              <div>
                <h4 className="text-base font-bold mb-3 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" /> Purchase & Invoice Records
                </h4>
                {customerHistory.sales && customerHistory.sales.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">Invoice #</th>
                          <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">Date</th>
                          <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">Items</th>
                          <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">Amount</th>
                          <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">Status</th>
                          <th className="py-2.5 px-3 text-right font-semibold text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerHistory.sales.map((sale) => (
                          <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-mono font-medium text-primary">{sale.invoiceNumber}</td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground">{formatDate(sale.createdAt)}</td>
                            <td className="py-2.5 px-3 text-xs">
                              {sale.items?.map((i) => `${i.product.name} (x${i.quantity})`).join(", ") || "—"}
                            </td>
                            <td className="py-2.5 px-3 font-bold">{formatCurrency(Number(sale.totalAmount))}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant={sale.status === "COMPLETED" ? "success" : sale.status === "PENDING" ? "secondary" : "destructive"}>
                                {sale.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Button asChild size="sm" variant="ghost">
                                <Link href={`/dashboard/sales/${sale.id}`}>View Invoice</Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No sales history found for this customer.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-4">No details found.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

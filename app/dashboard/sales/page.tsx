"use client";

import { useState } from "react";
import { Plus, FileText } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePaginatedApi } from "@/lib/hooks/use-api";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SaleItem { productId: string; quantity: number; unitPrice: number }
interface Sale {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  customer: { name: string } | null;
  items: { product: { name: string }; quantity: number }[];
}

interface Product { id: string; name: string; sellingPrice: string; stockQuantity: number }
interface Customer { id: string; name: string }

export default function SalesPage() {
  const { data, loading, page, setPage, totalPages, refetch } = usePaginatedApi<Sale>("/sales");
  const { data: products } = usePaginatedApi<Product>("/products", { limit: 100 });
  const { data: customers } = usePaginatedApi<Customer>("/customers", { limit: 100 });

  const [open, setOpen] = useState(false);
  const productList = products ?? [];
  const customerList = customers ?? [];
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<SaleItem[]>([{ productId: "", quantity: 1, unitPrice: 0 }]);
  const [payment, setPayment] = useState({ method: "CASH", amount: 0, reference: "" });
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) - discount;

  async function handleCreate() {
    setSaving(true);
    try {
      await api.post("/sales", {
        customerId: customerId || undefined,
        discount,
        items: items.filter((i) => i.productId),
        payment: { ...payment, amount: payment.amount || subtotal },
      });
      toast.success("Sale completed");
      setOpen(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create sale");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="Create sales and view invoices"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Sale
          </Button>
        }
      />

      <DataTable
        columns={[
          { key: "invoiceNumber", header: "Invoice #" },
          { key: "customer", header: "Customer", render: (r) => r.customer?.name ?? "Walk-in" },
          {
            key: "totalAmount",
            header: "Total",
            render: (r) => formatCurrency(Number(r.totalAmount)),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => <Badge variant="success">{r.status}</Badge>,
          },
          { key: "createdAt", header: "Date", render: (r) => formatDate(r.createdAt) },
          {
            key: "actions",
            header: "Invoice",
            render: (r) => (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/sales/${r.id}`}>
                  <FileText className="h-4 w-4 mr-1" /> View
                </Link>
              </Button>
            ),
          },
        ]}
        data={data}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer (optional)</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
                <SelectContent>
                  {customerList.length ? (
                    customerList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>No customers available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {items.map((item, i) => {
              const selectedProduct = productList.find(p => p.id === item.productId);
              return (
              <div key={i} className="space-y-1">
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={item.productId}
                    onValueChange={(v) => {
                      const p = products.find((x) => x.id === v);
                      const next = [...items];
                      next[i] = { ...next[i], productId: v, unitPrice: p ? Number(p.sellingPrice) : 0 };
                      setItems(next);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                    <SelectContent>
                      {productList.length ? (
                        productList.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.stockQuantity})</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>No products available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Input type="number" value={item.quantity} onChange={(e) => {
                    const next = [...items];
                    next[i].quantity = +e.target.value;
                    setItems(next);
                  }} />
                  <Input type="number" value={item.unitPrice} onChange={(e) => {
                    const next = [...items];
                    next[i].unitPrice = +e.target.value;
                    setItems(next);
                  }} />
                </div>
                {selectedProduct && (
                  <p className="text-xs text-muted-foreground ml-1">
                    Available Stock: <span className="font-medium text-primary">{selectedProduct.stockQuantity}</span>
                  </p>
                )}
              </div>
            )})}
            <Button variant="outline" size="sm" onClick={() => setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }])}>
              Add Item
            </Button>
            <div className="space-y-2">
              <Label>Discount</Label>
              <Input type="number" value={discount} onChange={(e) => setDiscount(+e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={payment.method} onValueChange={(v) => setPayment({ ...payment, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-lg font-semibold">Total: {formatCurrency(subtotal)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>Complete Sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

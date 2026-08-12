"use client";

import { useState } from "react";
import { Plus, FileText, Receipt, ClipboardList, ArrowRight, Printer } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  type: string;
  totalAmount: string;
  createdAt: string;
  customer: { name: string } | null;
  items: { product: { name: string }; quantity: number }[];
}

interface Product { id: string; name: string; sellingPrice: string; stockQuantity: number }
interface Customer { id: string; name: string }

const statusColor = (s: string) => {
  if (s === "COMPLETED") return "success" as const;
  if (s === "CANCELLED" || s === "REFUNDED") return "destructive" as const;
  if (s === "QUOTATION" || s === "PENDING") return "warning" as const;
  return "secondary" as const;
};

export default function SalesPage() {
  const { data, loading, page, setPage, totalPages, refetch } = usePaginatedApi<Sale>("/sales");
  const { data: products } = usePaginatedApi<Product>("/products", { limit: 100 });
  const { data: customers } = usePaginatedApi<Customer>("/customers", { limit: 100 });

  const [open, setOpen] = useState(false);
  const [saleType, setSaleType] = useState<"INVOICE" | "QUOTATION">("INVOICE");
  const productList = products ?? [];
  const customerList = customers ?? [];
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<SaleItem[]>([{ productId: "", quantity: 1, unitPrice: 0 }]);
  const [payment, setPayment] = useState({ method: "CASH", amount: 0, reference: "" });
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) - discount;

  function openCreate(type: "INVOICE" | "QUOTATION" = "INVOICE") {
    setSaleType(type);
    setCustomerId("");
    setItems([{ productId: "", quantity: 1, unitPrice: 0 }]);
    setPayment({ method: "CASH", amount: 0, reference: "" });
    setDiscount(0);
    setNotes("");
    setOpen(true);
  }

  async function handleCreate() {
    setSaving(true);
    try {
      await api.post("/sales", {
        customerId: customerId || undefined,
        type: saleType,
        discount,
        notes: notes || undefined,
        items: items.filter((i) => i.productId),
        payment: saleType === "INVOICE" ? { ...payment, amount: payment.amount || subtotal } : undefined,
      });
      toast.success(saleType === "QUOTATION" ? "Quotation created" : "Sale completed");
      setOpen(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create sale");
    } finally {
      setSaving(false);
    }
  }

  async function convertToInvoice(id: string) {
    try {
      await api.post(`/sales/${id}/convert`);
      toast.success("Quotation converted to invoice");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to convert");
    }
  }

  const quotations = data.filter((d) => d.type === "QUOTATION" || d.status === "QUOTATION");
  const invoices = data.filter((d) => d.type !== "QUOTATION" && d.status !== "QUOTATION");

  const columns = (showConvert = false) => [
    {
      key: "invoiceNumber",
      header: "Number",
      render: (r: Sale) => (
        <div className="flex items-center gap-2">
          {r.type === "QUOTATION"
            ? <ClipboardList className="h-4 w-4 text-amber-500" />
            : <Receipt className="h-4 w-4 text-green-500" />
          }
          <span className="font-mono text-sm">{r.invoiceNumber}</span>
        </div>
      ),
    },
    { key: "customer", header: "Customer", render: (r: Sale) => r.customer?.name ?? "Walk-in" },
    {
      key: "totalAmount",
      header: "Amount",
      render: (r: Sale) => <span className="font-medium">{formatCurrency(Number(r.totalAmount))}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r: Sale) => <Badge variant={statusColor(r.status)}>{r.status}</Badge>,
    },
    { key: "createdAt", header: "Date", render: (r: Sale) => formatDate(r.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (r: Sale) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/sales/${r.id}`}>
              <FileText className="h-4 w-4 mr-1" /> View
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); window.open(`/api/sales/${r.id}/invoice`, "_blank"); }}
            title="Print Invoice"
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
          {showConvert && r.type === "QUOTATION" && (
            <Button variant="outline" size="sm" onClick={() => convertToInvoice(r.id)}>
              <ArrowRight className="h-3 w-3 mr-1" /> Convert
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="Manage sales invoices and quotations"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCreate("QUOTATION")}>
              <ClipboardList className="h-4 w-4 mr-1" /> New Quotation
            </Button>
            <Button onClick={() => openCreate("INVOICE")}>
              <Plus className="h-4 w-4 mr-1" /> New Sale
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="quotations">Quotations ({quotations.length})</TabsTrigger>
          <TabsTrigger value="all">All ({data.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices">
          <DataTable columns={columns(false)} data={invoices} loading={loading}
            page={page} totalPages={totalPages} onPageChange={setPage}
            emptyMessage="No invoices yet" />
        </TabsContent>
        <TabsContent value="quotations">
          <DataTable columns={columns(true)} data={quotations} loading={loading}
            page={page} totalPages={totalPages} onPageChange={setPage}
            emptyMessage="No quotations yet" />
        </TabsContent>
        <TabsContent value="all">
          <DataTable columns={columns(true)} data={data} loading={loading}
            page={page} totalPages={totalPages} onPageChange={setPage}
            emptyMessage="No sales yet" />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {saleType === "QUOTATION" ? "New Quotation" : "New Sale / Invoice"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer (optional)</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
                <SelectContent>
                  {customerList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Items *</Label>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const selectedProduct = productList.find((p) => p.id === item.productId);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={item.productId}
                          onValueChange={(v) => {
                            const p = productList.find((x) => x.id === v);
                            const next = [...items];
                            next[i] = { ...next[i], productId: v, unitPrice: p ? Number(p.sellingPrice) : 0 };
                            setItems(next);
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                          <SelectContent>
                            {productList.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.stockQuantity} in stock)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input type="number" min={1} placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => { const next = [...items]; next[i].quantity = +e.target.value; setItems(next); }} />
                        <Input type="number" min={0} placeholder="Unit Price"
                          value={item.unitPrice}
                          onChange={(e) => { const next = [...items]; next[i].unitPrice = +e.target.value; setItems(next); }} />
                      </div>
                      {selectedProduct && (
                        <p className="text-xs text-muted-foreground ml-1">
                          Stock: <span className="font-medium text-primary">{selectedProduct.stockQuantity}</span> •
                          Subtotal: <span className="font-medium">{formatCurrency(item.quantity * item.unitPrice)}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" size="sm"
                onClick={() => setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }])}>
                + Add Item
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount</Label>
                <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(+e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input placeholder="Optional..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            {saleType === "INVOICE" && (
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
            )}

            <div className="rounded-md bg-muted p-3 flex justify-between text-sm font-medium">
              <span>{saleType === "QUOTATION" ? "Quoted Total" : "Total"}:</span>
              <span className="text-lg">{formatCurrency(subtotal)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || items.every((i) => !i.productId)}>
              {saving ? "Saving..." : saleType === "QUOTATION" ? "Create Quotation" : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

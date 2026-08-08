"use client";

import { useState } from "react";
import { ArrowLeftRight, Plus } from "lucide-react";
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
import { formatDate } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  reason: string | null;
  createdAt: string;
  product: { name: string; sku: string };
  warehouse: { name: string } | null;
  user: { name: string };
}

interface Warehouse { id: string; name: string; location: string | null }
interface Product { id: string; name: string; sku: string; stockQuantity: number }

export default function StockTransfersPage() {
  const { data: transactions, loading, page, setPage, totalPages, refetch } =
    usePaginatedApi<Transaction>("/inventory");
  const { data: warehouses } = usePaginatedApi<Warehouse>("/warehouses", { limit: 100 });
  const { data: products } = usePaginatedApi<Product>("/products", { limit: 100 });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    fromWarehouseId: "",
    toWarehouseId: "",
    quantity: 1,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  function openTransfer() {
    setForm({ productId: "", fromWarehouseId: "", toWarehouseId: "", quantity: 1, notes: "" });
    setOpen(true);
  }

  async function handleTransfer() {
    if (form.fromWarehouseId === form.toWarehouseId) {
      toast.error("Source and destination must be different");
      return;
    }
    setSaving(true);
    try {
      await api.post("/inventory/transfer", form);
      toast.success("Stock transferred successfully");
      setOpen(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setSaving(false);
    }
  }

  // Only show transfer-type transactions
  const transfers = transactions.filter((t) => t.reason?.includes("Transfer") || t.reason?.includes("transfer"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers"
        description="Move stock between warehouses and view transfer history"
        action={
          <Button onClick={openTransfer}>
            <Plus className="h-4 w-4 mr-1" /> New Transfer
          </Button>
        }
      />

      <DataTable
        columns={[
          {
            key: "product",
            header: "Product",
            render: (r: Transaction) => (
              <div>
                <p className="font-medium">{r.product.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{r.product.sku}</p>
              </div>
            ),
          },
          {
            key: "warehouse",
            header: "Warehouse",
            render: (r: Transaction) => r.warehouse?.name ?? "—",
          },
          {
            key: "type",
            header: "Direction",
            render: (r: Transaction) => (
              <Badge variant={r.type === "STOCK_IN" ? "success" : "destructive"}>
                <ArrowLeftRight className="h-3 w-3 mr-1" />
                {r.type === "STOCK_IN" ? "IN" : "OUT"}
              </Badge>
            ),
          },
          { key: "quantity", header: "Qty", render: (r: Transaction) => r.quantity },
          {
            key: "stock",
            header: "Stock Change",
            render: (r: Transaction) => (
              <span className="text-xs text-muted-foreground font-mono">
                {r.previousQty} → {r.newQty}
              </span>
            ),
          },
          { key: "reason", header: "Notes", render: (r: Transaction) => r.reason ?? "—" },
          { key: "user", header: "By", render: (r: Transaction) => r.user.name },
          { key: "createdAt", header: "Date", render: (r: Transaction) => formatDate(r.createdAt) },
        ]}
        data={transfers.length > 0 ? transfers : transactions}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No stock transfers yet. Use the 'New Transfer' button to move stock between warehouses."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Stock Between Warehouses</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.stockQuantity} total
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Warehouse *</Label>
                <Select value={form.fromWarehouseId} onValueChange={(v) => setForm({ ...form, fromWarehouseId: v })}>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} disabled={w.id === form.toWarehouseId}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Warehouse *</Label>
                <Select value={form.toWarehouseId} onValueChange={(v) => setForm({ ...form, toWarehouseId: v })}>
                  <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} disabled={w.id === form.fromWarehouseId}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Math.max(1, +e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Reason for transfer..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleTransfer}
              disabled={saving || !form.productId || !form.fromWarehouseId || !form.toWarehouseId}
            >
              {saving ? "Transferring..." : "Transfer Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { AlertTriangle, ArrowDown, ArrowUp, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePaginatedApi, useApiData } from "@/lib/hooks/use-api";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { canWriteInventory } from "@/lib/permissions";
import type { Role } from "@/app/generated/prisma/enums";

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

interface Product {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
}

interface Warehouse {
  id: string;
  name: string;
  location: string | null;
}

export default function InventoryPage() {
  const { data: session } = useSession();
  const canWrite = canWriteInventory((session?.user?.role ?? "SALES_MANAGER") as Role);
  const { data: history, loading, page, setPage, totalPages, refetch } =
    usePaginatedApi<Transaction>("/inventory");
  const { data: lowStock, refetch: refetchLowStock } = useApiData<Product[]>("/inventory/low-stock");
  const { data: productsRaw } = usePaginatedApi<Product>("/products");
  const { data: warehouses } = usePaginatedApi<Warehouse>("/warehouses", { limit: 100 });
  const products = productsRaw;

  const [form, setForm] = useState({
    productId: "",
    warehouseId: "",
    type: "STOCK_IN" as string,
    quantity: 1,
    reason: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/inventory", form);
      toast.success("Inventory updated");
      setForm({ productId: "", warehouseId: "", type: "STOCK_IN", quantity: 1, reason: "" });
      refetch();
      refetchLowStock();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update inventory");
    } finally {
      setSaving(false);
    }
  }

  const lowStockList = Array.isArray(lowStock) ? lowStock : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={canWrite ? "Stock in, stock out, adjustments, and history" : "View available stock levels for selling"}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {canWrite ? (
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Update Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.stockQuantity})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Warehouse *</Label>
                <Select value={form.warehouseId} onValueChange={(v) => setForm({ ...form, warehouseId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}{w.location ? ` — ${w.location}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STOCK_IN">📦 Stock In (Receiving)</SelectItem>
                    <SelectItem value="STOCK_OUT">📤 Stock Out (Dispatch)</SelectItem>
                    <SelectItem value="ADJUSTMENT">🔧 Adjustment (Correction)</SelectItem>
                    <SelectItem value="DAMAGE">💥 Damage (Write-off)</SelectItem>
                    <SelectItem value="LOST">❌ Lost / Missing</SelectItem>
                    <SelectItem value="EXPIRED">⏰ Expired</SelectItem>
                    <SelectItem value="RETURNED">↩️ Returned by Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.type === "ADJUSTMENT" ? "New Quantity" : "Quantity"}</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Optional" />
              </div>
              <Button type="submit" className="w-full" disabled={saving || !form.productId || !form.warehouseId}>
                {saving ? "Saving..." : "Submit"}
              </Button>
            </form>
          </CardContent>
        </Card>
        ) : (
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Available Stock</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {products.map((p) => (
                <div key={p.id} className="flex justify-between rounded-lg border p-3 text-sm">
                  <span className="font-medium truncate mr-2">{p.name}</span>
                  <Badge variant={p.stockQuantity > p.lowStockThreshold ? "success" : "warning"}>
                    {p.stockQuantity} units
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockList.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products are sufficiently stocked.</p>
            ) : (
              <div className="space-y-2">
                {lowStockList.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                    </div>
                    <Badge variant="warning">
                      {p.stockQuantity} / {p.lowStockThreshold}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="history" className="mt-4">
          <DataTable
            columns={[
              {
                key: "type",
                header: "Type",
                render: (r) => (
                  <div className="flex items-center gap-2">
                    {r.type === "STOCK_IN" && <ArrowDown className="h-4 w-4 text-primary" />}
                    {r.type === "STOCK_OUT" && <ArrowUp className="h-4 w-4 text-destructive" />}
                    {r.type === "ADJUSTMENT" && <Settings2 className="h-4 w-4" />}
                    {r.type.replace("_", " ")}
                  </div>
                ),
              },
              { key: "product", header: "Product", render: (r: Transaction) => (
                <div>
                  <p className="font-medium">{r.product.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{r.product.sku}</p>
                </div>
              )},
              { key: "warehouse", header: "Warehouse", render: (r: Transaction) => r.warehouse?.name ?? "—" },
              { key: "quantity", header: "Qty" },
              { key: "previousQty", header: "Before" },
              { key: "newQty", header: "After" },
              { key: "reason", header: "Reason", render: (r: Transaction) => r.reason ?? "—" },
              { key: "user", header: "By", render: (r: Transaction) => r.user.name },
              { key: "createdAt", header: "Date", render: (r: Transaction) => formatDate(r.createdAt) },
            ]}
            data={history}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

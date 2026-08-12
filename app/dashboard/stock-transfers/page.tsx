"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowLeftRight,
  Plus,
  Truck,
  PackageCheck,
  X,
  Clock,
  CheckCircle2,
  Send,
  ChevronRight,
} from "lucide-react";
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
import { formatDate } from "@/lib/utils";
import type { Role } from "@/app/generated/prisma/enums";

interface StockTransfer {
  id: string;
  transferNumber: string;
  status: "PENDING" | "DISPATCHED" | "RECEIVED" | "CANCELLED";
  quantity: number;
  notes: string | null;
  requestedAt: string;
  dispatchedAt: string | null;
  receivedAt: string | null;
  product: { id: string; name: string; sku: string };
  fromWarehouse: { id: string; name: string };
  toWarehouse: { id: string; name: string };
  requestedBy: { id: string; name: string };
  dispatchedBy: { id: string; name: string } | null;
  receivedBy: { id: string; name: string } | null;
}

interface Warehouse { id: string; name: string; location: string | null }
interface Product { id: string; name: string; sku: string; stockQuantity: number }

const STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "warning" as const, icon: Clock },
  DISPATCHED: { label: "Dispatched", color: "secondary" as const, icon: Truck },
  RECEIVED: { label: "Received", color: "success" as const, icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "destructive" as const, icon: X },
};

export default function StockTransfersPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role as Role | undefined) ?? "SALES_MANAGER";
  const isAdmin = role === "SUPER_ADMIN";
  const isInventoryManager = role === "INVENTORY_MANAGER";
  const isStoreManager = role === "STORE_MANAGER";
  const canCreate = isAdmin || isInventoryManager || isStoreManager;
  const canDispatch = isAdmin || isInventoryManager;
  const canReceive = isAdmin || isInventoryManager || isStoreManager;
  const canCancel = isAdmin || isInventoryManager;

  const { data: transfers, loading, page, setPage, totalPages, refetch } =
    usePaginatedApi<StockTransfer>("/stock-transfers");
  const { data: warehouses } = usePaginatedApi<Warehouse>("/warehouses", { limit: 100 });
  const { data: products } = usePaginatedApi<Product>("/products", { limit: 100 });

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: "",
    fromWarehouseId: "",
    toWarehouseId: "",
    quantity: 1,
    notes: "",
  });

  // Group by status for tabs
  const pending = transfers.filter((t) => t.status === "PENDING");
  const dispatched = transfers.filter((t) => t.status === "DISPATCHED");
  const received = transfers.filter((t) => t.status === "RECEIVED");
  const cancelled = transfers.filter((t) => t.status === "CANCELLED");

  async function handleCreate() {
    if (form.fromWarehouseId === form.toWarehouseId) {
      toast.error("Source and destination must be different");
      return;
    }
    setSaving(true);
    try {
      await api.post("/stock-transfers", form);
      toast.success("Transfer request created");
      setOpen(false);
      setForm({ productId: "", fromWarehouseId: "", toWarehouseId: "", quantity: 1, notes: "" });
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create transfer");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(id: string, action: "dispatch" | "receive" | "cancel") {
    setActioningId(id);
    try {
      await api.post(`/stock-transfers/${id}/${action}`);
      const labels = { dispatch: "dispatched", receive: "received", cancel: "cancelled" };
      toast.success(`Transfer ${labels[action]} successfully`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActioningId(null);
    }
  }

  const columns = [
    {
      key: "transferNumber",
      header: "Transfer #",
      render: (r: StockTransfer) => (
        <span className="font-mono font-semibold text-primary">{r.transferNumber}</span>
      ),
    },
    {
      key: "product",
      header: "Product",
      render: (r: StockTransfer) => (
        <div>
          <p className="font-medium">{r.product.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{r.product.sku}</p>
        </div>
      ),
    },
    {
      key: "route",
      header: "Route",
      render: (r: StockTransfer) => (
        <div className="flex items-center gap-1 text-sm">
          <span className="font-medium text-muted-foreground">{r.fromWarehouse.name}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{r.toWarehouse.name}</span>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      render: (r: StockTransfer) => (
        <span className="font-mono font-bold">{r.quantity}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: StockTransfer) => {
        const cfg = STATUS_CONFIG[r.status];
        const Icon = cfg.icon;
        return (
          <Badge variant={cfg.color} className="flex items-center gap-1 w-fit">
            <Icon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: "pipeline",
      header: "Stage",
      render: (r: StockTransfer) => (
        <div className="flex items-center gap-1 text-xs">
          <div className={`w-2 h-2 rounded-full ${r.status !== "CANCELLED" ? "bg-green-500" : "bg-gray-300"}`} />
          <div className={`h-px w-6 ${["DISPATCHED", "RECEIVED"].includes(r.status) ? "bg-green-500" : "bg-gray-200"}`} />
          <div className={`w-2 h-2 rounded-full ${["DISPATCHED", "RECEIVED"].includes(r.status) ? "bg-green-500" : "bg-gray-300"}`} />
          <div className={`h-px w-6 ${r.status === "RECEIVED" ? "bg-green-500" : "bg-gray-200"}`} />
          <div className={`w-2 h-2 rounded-full ${r.status === "RECEIVED" ? "bg-green-500" : "bg-gray-300"}`} />
        </div>
      ),
    },
    {
      key: "requestedBy",
      header: "By",
      render: (r: StockTransfer) => r.requestedBy.name,
    },
    {
      key: "requestedAt",
      header: "Date",
      render: (r: StockTransfer) => formatDate(r.requestedAt),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r: StockTransfer) => (
        <div className="flex gap-1 flex-wrap">
          {r.status === "PENDING" && canDispatch && (
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-300 hover:bg-blue-50 h-7 text-xs"
              disabled={actioningId === r.id}
              onClick={(e) => { e.stopPropagation(); handleAction(r.id, "dispatch"); }}
            >
              <Truck className="h-3 w-3 mr-1" /> Dispatch
            </Button>
          )}
          {r.status === "DISPATCHED" && canReceive && (
            <Button
              size="sm"
              className="h-7 text-xs bg-green-600 hover:bg-green-700"
              disabled={actioningId === r.id}
              onClick={(e) => { e.stopPropagation(); handleAction(r.id, "receive"); }}
            >
              <PackageCheck className="h-3 w-3 mr-1" /> Receive
            </Button>
          )}
          {["PENDING", "DISPATCHED"].includes(r.status) && canCancel && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs"
              disabled={actioningId === r.id}
              onClick={(e) => { e.stopPropagation(); handleAction(r.id, "cancel"); }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const renderTable = (rows: StockTransfer[]) => (
    <DataTable
      columns={columns}
      data={rows}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      emptyMessage="No transfers found"
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers"
        description="3-stage workflow: Request → Dispatch → Receive"
        action={
          canCreate ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Transfer
            </Button>
          ) : null
        }
      />

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Pending", count: pending.length, icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
          { label: "Dispatched", count: dispatched.length, icon: Truck, color: "text-blue-600 bg-blue-50 border-blue-200" },
          { label: "Received", count: received.length, icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200" },
          { label: "Cancelled", count: cancelled.length, icon: X, color: "text-red-600 bg-red-50 border-red-200" },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${color}`}>
            <div className="p-2 rounded-lg bg-white/60">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium opacity-80">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Transfer Pipeline Visual */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          {["Request Created", "Dispatched from Source", "Received at Destination"].map((step, i) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary font-bold text-xs">
                  {i + 1}
                </div>
                <span className="text-xs text-muted-foreground text-center max-w-[80px]">{step}</span>
              </div>
              {i < 2 && <div className="h-px w-24 bg-border mx-4 mb-5" />}
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({transfers.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched ({dispatched.length})</TabsTrigger>
          <TabsTrigger value="received">Received ({received.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderTable(transfers)}</TabsContent>
        <TabsContent value="pending">{renderTable(pending)}</TabsContent>
        <TabsContent value="dispatched">{renderTable(dispatched)}</TabsContent>
        <TabsContent value="received">{renderTable(received)}</TabsContent>
      </Tabs>

      {/* Create Transfer Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Create Stock Transfer Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 border p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">3-Stage Process:</strong> After creating this request, an Inventory Manager must <strong>Dispatch</strong> it (deducting from source), then the destination manager <strong>Receives</strong> it (adding to destination).
            </div>

            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — <span className="text-muted-foreground">{p.stockQuantity} in stock</span>
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
                      <SelectItem key={w.id} value={w.id} disabled={w.id === form.toWarehouseId}>{w.name}</SelectItem>
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
                      <SelectItem key={w.id} value={w.id} disabled={w.id === form.fromWarehouseId}>{w.name}</SelectItem>
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
              onClick={handleCreate}
              disabled={saving || !form.productId || !form.fromWarehouseId || !form.toWarehouseId}
            >
              <Send className="h-4 w-4 mr-1" />
              {saving ? "Creating..." : "Create Transfer Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

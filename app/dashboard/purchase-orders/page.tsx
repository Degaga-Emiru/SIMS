"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Check, X, PackageCheck, FileText, Send } from "lucide-react";
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
import type { Role } from "@/app/generated/prisma/enums";

interface POItem { productId: string; quantity: number; unitPrice: number }
interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  supplier: { name: string };
  requestedBy?: { name: string } | null;
  approvedBy?: { name: string } | null;
  items: { product: { name: string }; quantity: number }[];
}

interface Supplier { id: string; name: string }
interface Product { id: string; name: string; price: string }

const statusVariant = (s: string) => {
  if (s === "APPROVED" || s === "RECEIVED") return "success" as const;
  if (s === "REJECTED" || s === "CANCELLED") return "destructive" as const;
  if (s === "REQUESTED") return "warning" as const;
  if (s === "PENDING") return "secondary" as const;
  return "secondary" as const;
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user?.role as Role | undefined) ?? "SALES_MANAGER";
  const isInventoryManager = role === "INVENTORY_MANAGER";
  const isAdmin = role === "SUPER_ADMIN";
  const isStoreManager = role === "STORE_MANAGER";
  const canCreate = isInventoryManager || isAdmin || isStoreManager;
  const canApprove = isAdmin || isInventoryManager;
  const canReceive = isAdmin || isInventoryManager || isStoreManager;

  const { data, loading, page, setPage, totalPages, refetch } =
    usePaginatedApi<PurchaseOrder>("/purchase-orders");
  const { data: suppliers } = usePaginatedApi<Supplier>("/suppliers", { limit: 100 });
  const { data: products } = usePaginatedApi<Product>("/products", { limit: 100 });

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([{ productId: "", quantity: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function openCreate() {
    setSupplierId("");
    setNotes("");
    setItems([{ productId: "", quantity: 1, unitPrice: 0 }]);
    setOpen(true);
  }

  async function handleCreate() {
    setSaving(true);
    try {
      await api.post("/purchase-orders", {
        supplierId,
        notes: notes || undefined,
        items: items.filter((i) => i.productId),
      });
      const msg = isStoreManager ? "Purchase request submitted for approval" : "Purchase order created";
      toast.success(msg);
      setOpen(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(id: string, action: "approve" | "reject" | "receive") {
    try {
      if (action === "reject") {
        if (!rejectReason.trim()) { toast.error("Please enter a rejection reason"); return; }
        await api.post(`/purchase-orders/${id}/${action}`, { reason: rejectReason });
        setRejectingOrderId(null);
        setRejectReason("");
      } else {
        await api.post(`/purchase-orders/${id}/${action}`);
      }
      toast.success(`Order ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "received"}`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  const columns = [
    { key: "orderNumber", header: "Order #" },
    { key: "supplier", header: "Supplier", render: (r: PurchaseOrder) => r.supplier.name },
    {
      key: "requestedBy",
      header: "Requested By",
      render: (r: PurchaseOrder) => r.requestedBy?.name ?? r.supplier.name,
    },
    {
      key: "totalAmount",
      header: "Total",
      render: (r: PurchaseOrder) => formatCurrency(Number(r.totalAmount)),
    },
    {
      key: "status",
      header: "Status",
      render: (r: PurchaseOrder) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
    },
    { key: "createdAt", header: "Date", render: (r: PurchaseOrder) => formatDate(r.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (r: PurchaseOrder) => (
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="outline" asChild onClick={(e) => e.stopPropagation()}>
            <Link href={`/dashboard/purchase-orders/${r.id}`}>
              <FileText className="h-3 w-3 mr-1" /> View
            </Link>
          </Button>
          {(r.status === "REQUESTED" || r.status === "PENDING") && canApprove && (
            <>
              <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={(e) => { e.stopPropagation(); handleAction(r.id, "approve"); }}>
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); setRejectingOrderId(r.id); }}>
                <X className="h-3 w-3 mr-1" /> Reject
              </Button>
            </>
          )}
          {r.status === "APPROVED" && canReceive && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAction(r.id, "receive"); }}>
              <PackageCheck className="h-3 w-3 mr-1" /> Receive
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Tabs for different status groups
  const pending = data.filter((d) => ["REQUESTED", "PENDING"].includes(d.status));
  const active = data.filter((d) => ["APPROVED"].includes(d.status));
  const completed = data.filter((d) => ["RECEIVED", "REJECTED", "CANCELLED"].includes(d.status));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description={
          isStoreManager
            ? "Submit purchase requests — approved by Inventory Manager"
            : "Manage purchase orders and approve requests"
        }
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              {isStoreManager ? <Send className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isStoreManager ? "Request Purchase" : "New Order"}
            </Button>
          ) : null
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({data.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending / Requested ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        {[
          { value: "all", rows: data },
          { value: "pending", rows: pending },
          { value: "approved", rows: active },
          { value: "completed", rows: completed },
        ].map(({ value, rows }) => (
          <TabsContent key={value} value={value}>
            <DataTable
              columns={columns}
              data={rows}
              loading={loading}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              onRowClick={(row) => router.push(`/dashboard/purchase-orders/${row.id}`)}
              emptyMessage="No purchase orders found"
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={!!rejectingOrderId} onOpenChange={(o) => { if (!o) { setRejectingOrderId(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection</Label>
            <Input
              placeholder="Enter reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingOrderId(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectingOrderId && handleAction(rejectingOrderId, "reject")}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isStoreManager ? "Submit Purchase Request" : "Create Purchase Order"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Items *</Label>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <Select
                      value={item.productId}
                      onValueChange={(v) => {
                        const p = products.find((x) => x.id === v);
                        const next = [...items];
                        next[i] = { ...next[i], productId: v, unitPrice: p ? Number(p.price) : 0 };
                        setItems(next);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Qty"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => {
                        const next = [...items];
                        next[i].quantity = +e.target.value;
                        setItems(next);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Unit Price"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => {
                        const next = [...items];
                        next[i].unitPrice = +e.target.value;
                        setItems(next);
                      }}
                    />
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }])}>
                + Add Item
              </Button>
            </div>

            <div className="rounded-md bg-muted p-3 text-sm">
              <span className="font-medium">Total: </span>
              {formatCurrency(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !supplierId || items.every((i) => !i.productId)}>
              {saving ? "Submitting..." : isStoreManager ? "Submit Request" : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

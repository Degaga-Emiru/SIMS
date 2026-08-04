"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Check, X, PackageCheck, FileText } from "lucide-react";
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
import { usePaginatedApi, useApiData } from "@/lib/hooks/use-api";
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
  items: { product: { name: string }; quantity: number }[];
}

interface Supplier { id: string; name: string }
interface Product { id: string; name: string; price: string }

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user?.role as Role | undefined) ?? "SALES_MANAGER";
  const isInventoryManager = role === "INVENTORY_MANAGER";
  const isAdmin = role === "SUPER_ADMIN";
  const { data, loading, page, setPage, totalPages, refetch } =
    usePaginatedApi<PurchaseOrder>("/purchase-orders");
  const { data: suppliersRaw } = usePaginatedApi<Supplier>("/suppliers");
  const { data: productsRaw } = usePaginatedApi<Product>("/products");
  const suppliers = suppliersRaw;
  const products = productsRaw;

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<POItem[]>([{ productId: "", quantity: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function handleCreate() {
    setSaving(true);
    try {
      await api.post("/purchase-orders", { supplierId, items: items.filter((i) => i.productId) });
      toast.success("Purchase order created");
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
        if (!rejectReason.trim()) {
          toast.error("Please enter a rejection reason");
          return;
        }
        await api.post(`/purchase-orders/${id}/${action}`, { reason: rejectReason });
        setRejectingOrderId(null);
        setRejectReason("");
      } else {
        await api.post(`/purchase-orders/${id}/${action}`);
      }
      toast.success(`Order ${action}d`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  const statusVariant = (s: string) => {
    if (s === "APPROVED" || s === "RECEIVED") return "success" as const;
    if (s === "REJECTED") return "destructive" as const;
    if (s === "PENDING") return "warning" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description={isInventoryManager ? "Create and receive purchase orders" : "Review purchase orders submitted by the inventory team"}
        action={
          isInventoryManager ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New Order
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={[
          { key: "orderNumber", header: "Order #" },
          { key: "supplier", header: "Supplier", render: (r) => r.supplier.name },
          {
            key: "totalAmount",
            header: "Total",
            render: (r) => formatCurrency(Number(r.totalAmount)),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
          },
          { key: "createdAt", header: "Date", render: (r) => formatDate(r.createdAt) },
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" asChild onClick={(e) => e.stopPropagation()}>
                  <Link href={`/dashboard/purchase-orders/${r.id}`}>
                    <FileText className="h-3 w-3 mr-1" /> View
                  </Link>
                </Button>
                {r.status === "PENDING" && isAdmin && (
                  <>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleAction(r.id, "approve"); }}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setRejectingOrderId(r.id); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                )}
                {r.status === "APPROVED" && isInventoryManager && (
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAction(r.id, "receive"); }}>
                    <PackageCheck className="h-3 w-3 mr-1" /> Receive
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        data={data}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/dashboard/purchase-orders/${row.id}`)}
      />

      <Dialog open={!!rejectingOrderId} onOpenChange={(open) => { if (!open) { setRejectingOrderId(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection</Label>
            <Input
              placeholder="Enter the reason for rejecting this order"
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => {
                  const next = [...items];
                  next[i].quantity = +e.target.value;
                  setItems(next);
                }} />
                <Input type="number" placeholder="Price" value={item.unitPrice} onChange={(e) => {
                  const next = [...items];
                  next[i].unitPrice = +e.target.value;
                  setItems(next);
                }} />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }])}>
              Add Item
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !supplierId}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

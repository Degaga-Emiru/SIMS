"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Check, X, AlertTriangle, Clock } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApiData } from "@/lib/hooks/use-api";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Role } from "@/app/generated/prisma/enums";

interface ProductOption {
  id: string;
  name: string;
  stockQuantity: number;
  lowStockThreshold: number;
}

interface StockRequestItem {
  id: string;
  product: string;
  quantity: number;
  reason: string;
  priority: string;
  notes: string;
  status: string;
  date: string;
}

const priorityColor = (p: string) => {
  if (p === "Critical") return "destructive" as const;
  if (p === "High") return "warning" as const;
  if (p === "Medium") return "secondary" as const;
  return "outline" as const;
};

const statusColor = (s: string) => {
  if (s === "Approved") return "success" as const;
  if (s === "Rejected") return "destructive" as const;
  return "warning" as const;
};

export default function StockRequestsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const isStoreManager = role === "STORE_MANAGER";
  const canApprove = role === "SUPER_ADMIN" || role === "INVENTORY_MANAGER";

  const { data: productsData } = useApiData<ProductOption[]>("/products?limit=200");
  const { data: requestsData, refetch } = useApiData<StockRequestItem[]>("/stock-requests");
  const products = productsData ?? [];
  const requests = requestsData ?? [];

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: "",
    quantity: 1,
    reason: "",
    priority: "Medium",
    notes: "",
  });

  // Group requests by status
  const pending = requests.filter((r) => r.status === "Pending");
  const approved = requests.filter((r) => r.status === "Approved");
  const rejected = requests.filter((r) => r.status === "Rejected");

  async function handleCreate() {
    setSaving(true);
    try {
      await api.post("/stock-requests", form);
      toast.success("Stock request submitted successfully");
      setOpen(false);
      setForm({ productId: "", quantity: 1, reason: "", priority: "Medium", notes: "" });
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create stock request");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(id: string, status: "Approved" | "Rejected") {
    setUpdatingId(id);
    try {
      await api.patch(`/stock-requests/${id}`, { status });
      toast.success(`Request ${status.toLowerCase()}`);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  const columns = [
    {
      key: "product",
      header: "Product",
      render: (r: StockRequestItem) => <span className="font-medium">{r.product}</span>,
    },
    {
      key: "quantity",
      header: "Qty Requested",
      render: (r: StockRequestItem) => (
        <span className="font-mono font-medium text-primary">{r.quantity}</span>
      ),
    },
    { key: "reason", header: "Reason", render: (r: StockRequestItem) => r.reason },
    {
      key: "priority",
      header: "Priority",
      render: (r: StockRequestItem) => (
        <Badge variant={priorityColor(r.priority)}>{r.priority}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: StockRequestItem) => (
        <div className="flex items-center gap-1">
          {r.status === "Pending" && <Clock className="h-3 w-3 text-amber-500" />}
          {r.status === "Approved" && <Check className="h-3 w-3 text-green-500" />}
          {r.status === "Rejected" && <X className="h-3 w-3 text-destructive" />}
          <Badge variant={statusColor(r.status)}>{r.status}</Badge>
        </div>
      ),
    },
    { key: "date", header: "Date", render: (r: StockRequestItem) => formatDate(r.date) },
    ...(canApprove
      ? [{
          key: "actions",
          header: "Action",
          render: (r: StockRequestItem) =>
            r.status === "Pending" ? (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-300 hover:bg-green-50 h-7"
                  disabled={updatingId === r.id}
                  onClick={() => handleUpdateStatus(r.id, "Approved")}
                >
                  <Check className="h-3 w-3 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7"
                  disabled={updatingId === r.id}
                  onClick={() => handleUpdateStatus(r.id, "Rejected")}
                >
                  <X className="h-3 w-3 mr-1" /> Reject
                </Button>
              </div>
            ) : null,
        }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Requests"
        description={
          isStoreManager
            ? "Request stock replenishment from the Inventory Manager"
            : "Review and approve stock requests from store managers"
        }
        action={
          isStoreManager ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Stock Request
            </Button>
          ) : undefined
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", count: pending.length, icon: Clock, color: "text-amber-600 bg-amber-50" },
          { label: "Approved", count: approved.length, icon: Check, color: "text-green-600 bg-green-50" },
          { label: "Rejected", count: rejected.length, icon: X, color: "text-red-600 bg-red-50" },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="rounded-lg border p-4 flex items-center gap-3">
            <div className={`p-2 rounded-full ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>
        {[
          { value: "all", rows: requests },
          { value: "pending", rows: pending },
          { value: "approved", rows: approved },
          { value: "rejected", rows: rejected },
        ].map(({ value, rows }) => (
          <TabsContent key={value} value={value}>
            <DataTable
              columns={columns}
              data={rows}
              loading={false}
              emptyMessage={
                value === "pending"
                  ? "No pending stock requests"
                  : value === "approved"
                  ? "No approved requests yet"
                  : value === "rejected"
                  ? "No rejected requests"
                  : "No stock requests yet"
              }
            />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Stock Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select
                value={form.productId}
                onValueChange={(value) => setForm({ ...form, productId: value })}
              >
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <span>{product.name}</span>
                      {product.stockQuantity <= product.lowStockThreshold && (
                        <span className="ml-2 text-amber-500 text-xs">
                          <AlertTriangle className="inline h-3 w-3" /> Low ({product.stockQuantity})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Requested Quantity *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Low stock in store, High demand period"
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional context for the inventory team..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.productId || !form.reason}
            >
              {saving ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

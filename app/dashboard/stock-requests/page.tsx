"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useApiData } from "@/lib/hooks/use-api";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Role } from "@/app/generated/prisma/enums";

interface ProductOption {
  id: string;
  name: string;
  stockQuantity: number;
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

export default function StockRequestsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const isStoreManager = role === "STORE_MANAGER";
  const isAdmin = role === "SUPER_ADMIN";

  const { data: productsData } = useApiData<ProductOption[]>("/products?limit=100");
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

  async function handleCreate() {
    setSaving(true);
    try {
      await api.post("/stock-requests", form);
      toast.success("Stock request submitted");
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
      toast.success(`Stock request ${status.toLowerCase()}`);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update stock request");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Requests"
        description="Create and track replenishment requests for the store"
        action={
          isStoreManager ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New Stock Request
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Stock Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock requests yet.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{request.product}</p>
                    <p className="text-sm text-muted-foreground">Qty: {request.quantity} • {request.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(request.date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={request.status === "Approved" ? "success" : request.status === "Pending" ? "warning" : "destructive"}>{request.status}</Badge>
                    <span className="text-xs text-muted-foreground">Priority: {request.priority}</span>
                    {isAdmin && request.status === "Pending" && (
                      <div className="flex gap-1.5 mt-2">
                        <Button
                          size="sm"
                          disabled={updatingId === request.id}
                          className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                          onClick={() => handleUpdateStatus(request.id, "Approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={updatingId === request.id}
                          className="h-7 px-2.5 text-xs"
                          onClick={() => handleUpdateStatus(request.id, "Rejected")}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Stock Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={form.productId} onValueChange={(value) => setForm({ ...form, productId: value })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Requested Quantity</Label>
              <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Low stock in store" />
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
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add context for the inventory team" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.productId || !form.reason}>
              {saving ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

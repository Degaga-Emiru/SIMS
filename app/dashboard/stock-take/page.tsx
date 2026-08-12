"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Warehouse,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePaginatedApi, useApiData } from "@/lib/hooks/use-api";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Role } from "@/app/generated/prisma/enums";

interface StockTake {
  id: string;
  reference: string;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
  warehouse: { id: string; name: string };
  user: { id: string; name: string };
  items: { id: string; variance: number }[];
}

interface StockTakeItem {
  id: string;
  expectedQty: number;
  countedQty: number;
  variance: number;
  notes: string | null;
  product: { id: string; name: string; sku: string; image: string | null };
}

interface StockTakeDetail extends StockTake {
  items: StockTakeItem[];
}

interface WarehouseOption { id: string; name: string; location: string | null }

const STATUS_CONFIG = {
  IN_PROGRESS: { label: "In Progress", color: "warning" as const, icon: Clock },
  COMPLETED: { label: "Completed", color: "success" as const, icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "destructive" as const, icon: XCircle },
};

export default function StockTakePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user?.role as Role | undefined) ?? "SALES_MANAGER";
  const canManage = ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"].includes(role);

  const { data: stockTakes, loading, refetch } = usePaginatedApi<StockTake>("/stock-take");
  const { data: warehouses } = usePaginatedApi<WarehouseOption>("/warehouses", { limit: 100 });

  const [createOpen, setCreateOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Active session state
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: activeDetail, refetch: refetchDetail } = useApiData<StockTakeDetail>(
    activeId ? `/stock-take/${activeId}` : null
  );
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [finalizing, setFinalizing] = useState(false);

  async function handleCreate() {
    if (!warehouseId) { toast.error("Please select a warehouse"); return; }
    setSaving(true);
    try {
      const res = await api.post("/stock-take", { warehouseId, notes: notes || undefined });
      const id = res.data.data.id;
      toast.success(res.data.message);
      setCreateOpen(false);
      setWarehouseId("");
      setNotes("");
      refetch();
      // Open the new session immediately
      openSession(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start stock take");
    } finally {
      setSaving(false);
    }
  }

  function openSession(id: string) {
    setActiveId(id);
    setCounts({});
  }

  async function saveItemCounts() {
    if (!activeDetail) return;
    const items = activeDetail.items
      .filter((i) => counts[i.id] !== undefined)
      .map((i) => ({ id: i.id, countedQty: counts[i.id] ?? i.countedQty }));
    if (items.length === 0) { toast.error("No changes to save"); return; }
    try {
      await api.patch(`/stock-take/${activeId}`, { items });
      toast.success("Counts saved");
      refetchDetail();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function handleFinalize() {
    if (!activeId) return;
    setFinalizing(true);
    try {
      // Save pending counts first
      if (Object.keys(counts).length > 0) await saveItemCounts();
      const res = await api.post(`/stock-take/${activeId}`);
      toast.success(res.data.message);
      setActiveId(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Finalize failed");
    } finally {
      setFinalizing(false);
    }
  }

  const completedCount = stockTakes.filter((s) => s.status === "COMPLETED").length;
  const inProgressCount = stockTakes.filter((s) => s.status === "IN_PROGRESS").length;

  // Active session worksheet
  if (activeId && activeDetail) {
    const items = activeDetail.items;
    const totalVariance = items.reduce((sum, i) => {
      const counted = counts[i.id] ?? i.countedQty;
      return sum + (counted - i.expectedQty);
    }, 0);
    const changedItems = items.filter((i) => {
      const counted = counts[i.id] ?? i.countedQty;
      return counted !== i.expectedQty;
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setActiveId(null)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1"
            >
              ← Back to Stock Takes
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              {activeDetail.reference} — {activeDetail.warehouse.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Started {formatDate(activeDetail.startedAt)} · {items.length} products
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveItemCounts}>Save Progress</Button>
            <Button
              onClick={handleFinalize}
              disabled={finalizing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {finalizing ? "Finalizing..." : "Finalize & Adjust"}
            </Button>
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border p-4 bg-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Products</p>
            <p className="text-3xl font-bold">{items.length}</p>
          </div>
          <div className={`rounded-xl border p-4 ${changedItems.length > 0 ? "bg-amber-50 border-amber-200" : "bg-card"}`}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">With Variance</p>
            <p className="text-3xl font-bold text-amber-600">{changedItems.length}</p>
          </div>
          <div className={`rounded-xl border p-4 ${totalVariance !== 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Net Variance</p>
            <p className={`text-3xl font-bold ${totalVariance > 0 ? "text-green-600" : totalVariance < 0 ? "text-red-600" : "text-green-600"}`}>
              {totalVariance > 0 ? "+" : ""}{totalVariance}
            </p>
          </div>
        </div>

        {/* Worksheet table */}
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-semibold">Product</th>
                <th className="text-center px-4 py-3 font-semibold w-32">Expected</th>
                <th className="text-center px-4 py-3 font-semibold w-36">Counted</th>
                <th className="text-center px-4 py-3 font-semibold w-28">Variance</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const counted = counts[item.id] ?? item.countedQty;
                const variance = counted - item.expectedQty;
                return (
                  <tr key={item.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${variance !== 0 ? "bg-amber-50/50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {item.product.image
                            ? <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                            : <span className="text-xs font-bold text-muted-foreground">{item.product.name.charAt(0)}</span>}
                        </div>
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-semibold text-muted-foreground">{item.expectedQty}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        value={counts[item.id] ?? item.countedQty}
                        onChange={(e) => setCounts({ ...counts, [item.id]: +e.target.value })}
                        className="w-24 mx-auto text-center font-mono h-8"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {variance === 0 ? (
                        <span className="text-green-600 font-semibold">✓</span>
                      ) : (
                        <span className={`font-bold font-mono ${variance > 0 ? "text-green-600" : "text-red-600"}`}>
                          {variance > 0 ? "+" : ""}{variance}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Physical Stock Take"
        description="Count physical inventory and reconcile with system records"
        action={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Start Stock Take
            </Button>
          ) : null
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border p-4 bg-card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stockTakes.length}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </div>
        </div>
        <div className="rounded-xl border p-4 bg-amber-50 border-amber-200 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/60">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{inProgressCount}</p>
            <p className="text-xs text-amber-600/80">In Progress</p>
          </div>
        </div>
        <div className="rounded-xl border p-4 bg-green-50 border-green-200 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/60">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            <p className="text-xs text-green-600/80">Completed</p>
          </div>
        </div>
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading sessions...</div>
      ) : stockTakes.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-muted/30">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-semibold">No stock takes yet</p>
          <p className="text-sm text-muted-foreground mt-1">Start a stock take to count physical inventory</p>
          {canManage && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Start First Stock Take
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {stockTakes.map((st) => {
            const cfg = STATUS_CONFIG[st.status];
            const Icon = cfg.icon;
            const variantItems = st.items.filter((i) => i.variance !== 0).length;

            return (
              <div
                key={st.id}
                className="rounded-xl border bg-card p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => st.status === "IN_PROGRESS" ? openSession(st.id) : null}
              >
                <div className="p-3 rounded-xl bg-muted/50">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono">{st.reference}</span>
                    <Badge variant={cfg.color} className="flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                    {variantItems > 0 && (
                      <Badge variant="warning" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {variantItems} variance{variantItems !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Warehouse className="h-3 w-3" /> {st.warehouse.name}
                    </span>
                    <span>·</span>
                    <span>{st.items.length} products</span>
                    <span>·</span>
                    <span>Started {formatDate(st.startedAt)}</span>
                    {st.completedAt && <><span>·</span><span>Completed {formatDate(st.completedAt)}</span></>}
                    <span>·</span>
                    <span>By {st.user.name}</span>
                  </div>
                </div>
                {st.status === "IN_PROGRESS" && (
                  <div className="flex items-center gap-2 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Resume <ChevronRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Start Physical Stock Take
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 border p-3 text-xs text-muted-foreground">
              This will create a worksheet of all products in the selected warehouse. Count each item and finalize to automatically apply adjustment transactions.
            </div>
            <div className="space-y-2">
              <Label>Warehouse *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Select warehouse to audit" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}{w.location ? ` — ${w.location}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. Year-end audit, Q3 reconciliation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !warehouseId}>
              {saving ? "Starting..." : "Start Stock Take"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

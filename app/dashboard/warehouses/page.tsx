"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Building2, Package, Eye, X, Edit, Trash } from "lucide-react";
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

interface Manager { id: string; name: string; role: string }
interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  managerId: string | null;
  manager: { name: string; email: string } | null;
  _count?: { stocks: number };
}

interface WarehouseStock {
  id: string;
  quantity: number;
  reservedQuantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
    price: string;
    sellingPrice: string;
    image: string | null;
  };
}

interface ProductOption { id: string; name: string; sku: string }

export default function WarehousesPage() {
  const { data, loading, page, setPage, totalPages, search, setSearch, refetch } =
    usePaginatedApi<Warehouse>("/warehouses");
  const { data: managers } = usePaginatedApi<Manager>("/employees", { limit: 100 });
  const { data: allProducts } = usePaginatedApi<ProductOption>("/products", { limit: 150 });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState({ name: "", location: "", managerId: "" });
  const [saving, setSaving] = useState(false);

  // Warehouse Stock Management State
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [stockOpen, setStockOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<WarehouseStock | null>(null);

  // Stock forms
  const [assignForm, setAssignForm] = useState({ productId: "", quantity: 0 });
  const [adjustForm, setAdjustForm] = useState({ quantity: 0 });
  const [stockSaving, setStockSaving] = useState(false);

  // Fetch stocks dynamically for selected warehouse
  const {
    data: warehouseStocks,
    loading: stocksLoading,
    refetch: refetchStocks,
  } = usePaginatedApi<WarehouseStock>(
    selectedWarehouse ? `/warehouses/${selectedWarehouse.id}/products` : ""
  );

  function openCreate() {
    setEditing(null);
    setForm({ name: "", location: "", managerId: "" });
    setOpen(true);
  }

  function openEdit(w: Warehouse) {
    setEditing(w);
    setForm({ name: w.name, location: w.location ?? "", managerId: w.managerId ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        location: form.location || undefined,
        managerId: form.managerId || null,
      };
      if (editing) {
        await api.put(`/warehouses/${editing.id}`, payload);
        toast.success("Warehouse updated");
      } else {
        await api.post("/warehouses", payload);
        toast.success("Warehouse created");
      }
      setOpen(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this warehouse? All associated stock records will also be removed.")) return;
    try {
      await api.delete(`/warehouses/${id}`);
      toast.success("Warehouse deleted");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  // Stock management actions
  function openManageStock(w: Warehouse) {
    setSelectedWarehouse(w);
    setStockOpen(true);
  }

  function openAssignProduct() {
    setAssignForm({ productId: "", quantity: 0 });
    setAssignOpen(true);
  }

  async function handleAssignProduct() {
    if (!selectedWarehouse) return;
    setStockSaving(true);
    try {
      await api.post(`/warehouses/${selectedWarehouse.id}/products`, assignForm);
      toast.success("Product assigned to warehouse");
      setAssignOpen(false);
      refetchStocks();
      refetch(); // Update SKU count on warehouse row
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign product");
    } finally {
      setStockSaving(false);
    }
  }

  function openAdjustStock(stock: WarehouseStock) {
    setSelectedStock(stock);
    setAdjustForm({ quantity: stock.quantity });
    setAdjustOpen(true);
  }

  async function handleAdjustStock() {
    if (!selectedWarehouse || !selectedStock) return;
    setStockSaving(true);
    try {
      await api.put(
        `/warehouses/${selectedWarehouse.id}/products/${selectedStock.id}`,
        adjustForm
      );
      toast.success("Stock level updated");
      setAdjustOpen(false);
      refetchStocks();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update stock");
    } finally {
      setStockSaving(false);
    }
  }

  async function handleRemoveProduct(stockId: string) {
    if (!selectedWarehouse) return;
    if (!confirm("Are you sure you want to remove this product from the warehouse? This will subtract its warehouse quantity from global stock.")) return;
    try {
      await api.delete(`/warehouses/${selectedWarehouse.id}/products/${stockId}`);
      toast.success("Product removed from warehouse");
      refetchStocks();
      refetch(); // Update SKU count
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove product");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        description="Manage storage locations, assign managers, and allocate stocked products"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add Warehouse
          </Button>
        }
      />

      <Input
        placeholder="Search warehouses..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      <DataTable
        columns={[
          {
            key: "name",
            header: "Warehouse",
            render: (r: Warehouse) => (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-semibold">{r.name}</span>
              </div>
            ),
          },
          { key: "location", header: "Location", render: (r: Warehouse) => r.location ?? "—" },
          {
            key: "manager",
            header: "Manager",
            render: (r: Warehouse) => r.manager?.name ?? <span className="text-muted-foreground text-xs">Unassigned</span>,
          },
          {
            key: "stocks",
            header: "Products Map",
            render: (r: Warehouse) => (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Package className="h-3 w-3" />
                {r._count?.stocks ?? 0} SKUs
              </span>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            render: (r: Warehouse) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => openManageStock(r)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Manage Stock
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={data}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={(row) => openManageStock(row)}
        emptyMessage="No warehouses found. Add your first warehouse to start tracking stock by location."
      />

      {/* Warehouse create/edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Warehouse Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Main Store, East Wing, Cold Storage"
              />
            </div>
            <div className="space-y-2">
              <Label>Location / Address</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Block A, 2nd Floor, Addis Ababa"
              />
            </div>
            <div className="space-y-2">
              <Label>Warehouse Manager</Label>
              <Select
                value={form.managerId}
                onValueChange={(v) => setForm({ ...form, managerId: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager assigned</SelectItem>
                  {managers
                    .filter((m) => ["SUPER_ADMIN", "INVENTORY_MANAGER", "STORE_MANAGER"].includes(m.role))
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving..." : "Save Warehouse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warehouse Stocks List Dialog */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {selectedWarehouse?.name} — Stock Sheet
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">Location: {selectedWarehouse?.location ?? "N/A"}</p>
            </div>
            <Button onClick={openAssignProduct} className="text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Product to Warehouse
            </Button>
          </DialogHeader>

          <div className="py-4">
            {stocksLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading stock levels...</div>
            ) : warehouseStocks.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl">
                <Package className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm font-semibold">No products in this warehouse</p>
                <p className="text-xs text-muted-foreground mt-0.5">Click the button above to assign a product.</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3 text-right">Available Qty</th>
                      <th className="px-4 py-3 text-right">Reserved Qty</th>
                      <th className="px-4 py-3 text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouseStocks.map((stock) => (
                      <tr key={stock.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                          <div className="w-7 h-7 bg-muted rounded-md overflow-hidden shrink-0 flex items-center justify-center">
                            {stock.product.image ? (
                              <img src={stock.product.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <span>{stock.product.name}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{stock.product.sku}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary">{stock.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">{stock.reservedQuantity}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openAdjustStock(stock)}
                              title="Edit Quantity"
                            >
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveProduct(stock.id)}
                              title="Remove Product"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStockOpen(false)}>Close Sheet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Product Sub-Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Product to {selectedWarehouse?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select
                value={assignForm.productId}
                onValueChange={(v) => setAssignForm({ ...assignForm, productId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {allProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Quantity *</Label>
              <Input
                type="number"
                min={0}
                value={assignForm.quantity}
                onChange={(e) => setAssignForm({ ...assignForm, quantity: Math.max(0, +e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignProduct} disabled={stockSaving || !assignForm.productId}>
              {stockSaving ? "Adding..." : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Quantity Sub-Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Stock Level</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">{selectedStock?.product.name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">SKU: {selectedStock?.product.sku}</p>
            </div>
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min={0}
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Math.max(0, +e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjustStock} disabled={stockSaving}>
              {stockSaving ? "Updating..." : "Update Quantity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

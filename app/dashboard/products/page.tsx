"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Trash2, Upload, QrCode, Tag, Eye, Package, ImageIcon } from "lucide-react";
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
import { usePaginatedApi, useApiData } from "@/lib/hooks/use-api";
import { formatCurrency, generateSKU } from "@/lib/utils";
import { canWriteProducts } from "@/lib/permissions";
import type { Role } from "@/app/generated/prisma/enums";
import api from "@/lib/api";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  qrCode: string | null;
  price: string;
  sellingPrice: string;
  wholesalePrice: string | null;
  tax: string | null;
  discount: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  maxStock: number | null;
  unit: string | null;
  status: string;
  image: string | null;
  description: string | null;
  category: { id: string; name: string };
  brand: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  categoryId: string;
  brandId: string | null;
  supplierId: string | null;
}

interface Category { id: string; name: string }
interface Brand { id: string; name: string }
interface Supplier { id: string; name: string }

const emptyForm = {
  name: "",
  sku: generateSKU(),
  barcode: "",
  description: "",
  price: 0,
  sellingPrice: 0,
  wholesalePrice: 0,
  tax: 0,
  discount: 0,
  stockQuantity: 0,
  lowStockThreshold: 10,
  maxStock: 0,
  unit: "",
  status: "ACTIVE",
  categoryId: "",
  brandId: "",
  supplierId: "",
  image: "",
};

export default function ProductsPage() {
  const { data: session } = useSession();
  const canWrite = canWriteProducts((session?.user?.role ?? "SALES_MANAGER") as Role);
  const { data, loading, page, setPage, totalPages, search, setSearch, refetch } =
    usePaginatedApi<Product>("/products");
  const { data: categories } = useApiData<Category[]>("/categories?limit=100");
  const { data: brands } = useApiData<Brand[]>("/brands?limit=100");
  const { data: suppliers } = useApiData<Supplier[]>("/suppliers?limit=100");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const categoryList = categories ?? [];
  const brandList = brands ?? [];
  const supplierList = suppliers ?? [];

  const lowStock = data.filter((p) => p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0);
  const outOfStock = data.filter((p) => p.stockQuantity === 0);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, sku: generateSKU() });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? "",
      description: p.description ?? "",
      price: Number(p.price),
      sellingPrice: Number(p.sellingPrice),
      wholesalePrice: Number(p.wholesalePrice ?? 0),
      tax: Number(p.tax ?? 0),
      discount: Number(p.discount ?? 0),
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      maxStock: p.maxStock ?? 0,
      unit: p.unit ?? "",
      status: p.status,
      categoryId: p.categoryId,
      brandId: p.brandId ?? "",
      supplierId: p.supplierId ?? "",
      image: p.image ?? "",
    });
    setOpen(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post<{ data: { url: string } }>("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((f) => ({ ...f, image: res.data.data.url }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        brandId: form.brandId || null,
        supplierId: form.supplierId || null,
        wholesalePrice: form.wholesalePrice || undefined,
        maxStock: form.maxStock || undefined,
        unit: form.unit || undefined,
      };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("Product created");
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
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const tableColumns = [
    {
      key: "name",
      header: "Product",
      render: (r: Product) => (
        <div className="flex items-center gap-3">
          <div
            onClick={() => setViewingProduct(r)}
            className="group relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/50 shadow-sm transition-all hover:ring-2 hover:ring-primary"
            title="Click to view product image and details"
          >
            {r.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.image} alt={r.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground transition-transform group-hover:scale-110" />
            )}
          </div>
          <div>
            <button
              onClick={() => setViewingProduct(r)}
              className="font-medium hover:text-primary hover:underline text-left transition-colors"
            >
              {r.name}
            </button>
            <p className="text-xs text-muted-foreground font-mono">{r.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "brand",
      header: "Brand",
      render: (r: Product) => r.brand ? (
        <span className="inline-flex items-center gap-1 text-xs">
          <Tag className="h-3 w-3 text-primary" /> {r.brand.name}
        </span>
      ) : <span className="text-muted-foreground text-xs">—</span>,
    },
    { key: "category", header: "Category", render: (r: Product) => r.category.name },
    {
      key: "sellingPrice",
      header: "Selling Price",
      render: (r: Product) => formatCurrency(Number(r.sellingPrice)),
    },
    {
      key: "stockQuantity",
      header: "Stock",
      render: (r: Product) => (
        <div className="flex items-center gap-1">
          <span className={
            r.stockQuantity === 0
              ? "text-destructive font-bold"
              : r.stockQuantity <= r.lowStockThreshold
              ? "text-amber-600 font-medium"
              : "text-foreground"
          }>
            {r.stockQuantity}
          </span>
          {r.unit && <span className="text-xs text-muted-foreground">{r.unit}</span>}
        </div>
      ),
    },
    {
      key: "qrCode",
      header: "QR / Barcode",
      render: (r: Product) => (
        <div className="flex flex-col text-xs text-muted-foreground font-mono">
          {r.barcode && <span>{r.barcode}</span>}
          {r.qrCode && <span className="flex items-center gap-1"><QrCode className="h-3 w-3" />{r.qrCode.slice(0, 10)}...</span>}
          {!r.barcode && !r.qrCode && "—"}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: Product) => (
        <Badge variant={r.status === "ACTIVE" ? "success" : r.status === "DISCONTINUED" ? "destructive" : "secondary"}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r: Product) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" title="View details and image" onClick={() => setViewingProduct(r)}>
            <Eye className="h-4 w-4 text-primary" />
          </Button>
          {canWrite && (
            <>
              <Button variant="ghost" size="icon" title="Edit product" onClick={() => openEdit(r)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Delete product" onClick={() => handleDelete(r.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={canWrite ? "Manage your product catalog with brands, barcodes, and QR codes" : "View available products and stock levels"}
        action={
          canWrite ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <Input
          placeholder="Search by name, SKU, or barcode..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />

        <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/30">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="text-xs"
          >
            Grid Catalog
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="text-xs"
          >
            Table View
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({data.length})</TabsTrigger>
          <TabsTrigger value="low">
            Low Stock ({lowStock.length})
          </TabsTrigger>
          <TabsTrigger value="out">Out of Stock ({outOfStock.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 max-h-[75vh] overflow-y-auto pr-1">
              {data.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setViewingProduct(p)}
                  className="group relative flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md cursor-pointer"
                >
                  <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border bg-secondary/30 mb-3">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground opacity-50 transition-transform group-hover:scale-110" />
                    )}
                    <Badge
                      variant={p.status === "ACTIVE" ? "success" : "secondary"}
                      className="absolute top-2 right-2 text-[10px]"
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">{p.name}</h4>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">SKU: {p.sku}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.category.name}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Price</p>
                      <p className="text-base font-bold text-primary">{formatCurrency(Number(p.sellingPrice))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-muted-foreground">Stock</p>
                      <p className={`text-sm font-bold ${p.stockQuantity === 0 ? "text-destructive" : p.stockQuantity <= p.lowStockThreshold ? "text-amber-600" : "text-foreground"}`}>
                        {p.stockQuantity} {p.unit ?? ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DataTable columns={tableColumns} data={data} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </TabsContent>
        <TabsContent value="low" className="mt-4">
          <DataTable columns={tableColumns} data={lowStock} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} emptyMessage="No low stock products" />
        </TabsContent>
        <TabsContent value="out" className="mt-4">
          <DataTable columns={tableColumns} data={outOfStock} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} emptyMessage="All products are in stock" />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Basic Info */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Samsung Galaxy A54" />
            </div>
            <div className="space-y-2">
              <Label>SKU *</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Barcode</Label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or type barcode" />
            </div>

            {/* Pricing */}
            <div className="space-y-2">
              <Label>Cost / Purchase Price</Label>
              <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Selling Price *</Label>
              <Input type="number" min={0} value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Wholesale Price</Label>
              <Input type="number" min={0} value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tax (%)</Label>
              <Input type="number" min={0} max={100} value={form.tax} onChange={(e) => setForm({ ...form, tax: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Discount (%)</Label>
              <Input type="number" min={0} max={100} value={form.discount} onChange={(e) => setForm({ ...form, discount: +e.target.value })} />
            </div>

            {/* Stock */}
            <div className="space-y-2">
              <Label>Current Stock</Label>
              <Input type="number" min={0} value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Min Stock (Low Alert)</Label>
              <Input type="number" min={0} value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Max Stock</Label>
              <Input type="number" min={0} value={form.maxStock} onChange={(e) => setForm({ ...form, maxStock: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. pcs, kg, litres" />
            </div>

            {/* Classification */}
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categoryList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={form.brandId} onValueChange={(v) => setForm({ ...form, brandId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select brand (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No brand</SelectItem>
                  {brandList.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {supplierList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description..." />
            </div>

            {/* Image */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Product Image</Label>
              <div className="flex items-center gap-4">
                {form.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt="Product" className="h-16 w-16 rounded-lg object-cover border" />
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span><Upload className="h-4 w-4 mr-1" /> Upload Image</span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.categoryId}>
              {saving ? "Saving..." : editing ? "Update Product" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Image & Details Viewer Modal */}
      <Dialog open={!!viewingProduct} onOpenChange={(o) => !o && setViewingProduct(null)}>
        <DialogContent className="max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-primary" />
              Product Details & Image
            </DialogTitle>
          </DialogHeader>

          {viewingProduct && (
            <div className="space-y-6 py-2">
              {/* Image Preview Box */}
              <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/30 p-6">
                {viewingProduct.image ? (
                  <div className="group relative max-h-72 w-full flex items-center justify-center overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewingProduct.image}
                      alt={viewingProduct.name}
                      className="max-h-72 w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <ImageIcon className="h-16 w-16 stroke-1 opacity-50" />
                    <p className="mt-2 text-sm">No image uploaded for this product</p>
                  </div>
                )}
              </div>

              {/* Basic Info Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{viewingProduct.name}</h3>
                  <p className="text-sm font-mono text-muted-foreground mt-0.5">SKU: {viewingProduct.sku}</p>
                </div>
                <Badge variant={viewingProduct.status === "ACTIVE" ? "success" : viewingProduct.status === "DISCONTINUED" ? "destructive" : "secondary"}>
                  {viewingProduct.status}
                </Badge>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">Selling Price</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(Number(viewingProduct.sellingPrice))}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">Cost Price</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(Number(viewingProduct.price))}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">Current Stock</p>
                  <p className={`text-lg font-bold ${
                    viewingProduct.stockQuantity === 0
                      ? "text-destructive"
                      : viewingProduct.stockQuantity <= viewingProduct.lowStockThreshold
                      ? "text-amber-600"
                      : "text-foreground"
                  }`}>
                    {viewingProduct.stockQuantity} {viewingProduct.unit ?? ""}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">Category</p>
                  <p className="text-sm font-semibold">{viewingProduct.category.name}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">Brand</p>
                  <p className="text-sm font-semibold">{viewingProduct.brand?.name ?? "—"}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">Supplier</p>
                  <p className="text-sm font-semibold">{viewingProduct.supplier?.name ?? "—"}</p>
                </div>
              </div>

              {/* Barcode & Description */}
              {(viewingProduct.barcode || viewingProduct.qrCode || viewingProduct.description) && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
                  {viewingProduct.barcode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Barcode:</span>
                      <span className="font-mono font-medium">{viewingProduct.barcode}</span>
                    </div>
                  )}
                  {viewingProduct.qrCode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">QR Code Token:</span>
                      <span className="font-mono font-medium">{viewingProduct.qrCode}</span>
                    </div>
                  )}
                  {viewingProduct.description && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Description:</span>
                      <p className="text-foreground text-xs leading-relaxed">{viewingProduct.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {canWrite && viewingProduct && (
              <Button variant="outline" onClick={() => { const p = viewingProduct; setViewingProduct(null); openEdit(p); }}>
                <Pencil className="h-4 w-4 mr-1" /> Edit Product
              </Button>
            )}
            <Button variant="secondary" onClick={() => setViewingProduct(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


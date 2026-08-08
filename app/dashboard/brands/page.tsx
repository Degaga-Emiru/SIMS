"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePaginatedApi } from "@/lib/hooks/use-api";
import api from "@/lib/api";

interface Brand {
  id: string;
  name: string;
  description: string | null;
  _count?: { products: number };
}

export default function BrandsPage() {
  const { data, loading, page, setPage, totalPages, search, setSearch, refetch } =
    usePaginatedApi<Brand>("/brands");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "" });
    setOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditing(brand);
    setForm({ name: brand.name, description: brand.description ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/brands/${editing.id}`, form);
        toast.success("Brand updated");
      } else {
        await api.post("/brands", form);
        toast.success("Brand created");
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
    if (!confirm("Delete this brand? Products with this brand will not be deleted.")) return;
    try {
      await api.delete(`/brands/${id}`);
      toast.success("Brand deleted");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brands"
        description="Manage product brands"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Brand
          </Button>
        }
      />

      <Input
        placeholder="Search brands..."
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
            header: "Brand Name",
            render: (r) => (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <span className="font-medium">{r.name}</span>
              </div>
            ),
          },
          { key: "description", header: "Description", render: (r) => r.description ?? "—" },
          {
            key: "products",
            header: "Products",
            render: (r) => (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {r._count?.products ?? 0} products
              </span>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
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
        emptyMessage="No brands found. Add your first brand to get started."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Brand" : "Add Brand"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Nike, Samsung, Unilever"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional brand description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving..." : "Save Brand"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

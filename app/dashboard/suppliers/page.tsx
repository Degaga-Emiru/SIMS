"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePaginatedApi } from "@/lib/hooks/use-api";
import api from "@/lib/api";

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  tin: string | null;
  rating: number | null;
  outstandingBalance: string;
}

const emptyForm = {
  name: "", email: "", phone: "", address: "", contactPerson: "", tin: "", rating: "",
};

function StarRating({ value }: { value: number | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">Not rated</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
      <span className="text-xs ml-1 text-muted-foreground">{value}/5</span>
    </div>
  );
}

export default function SuppliersPage() {
  const { data, loading, page, setPage, totalPages, search, setSearch, refetch } =
    usePaginatedApi<Supplier>("/suppliers");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name,
      email: s.email ?? "",
      phone: s.phone ?? "",
      address: s.address ?? "",
      contactPerson: s.contactPerson ?? "",
      tin: s.tin ?? "",
      rating: s.rating?.toString() ?? "",
    });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        email: form.email || undefined,
        tin: form.tin || undefined,
        rating: form.rating ? Number(form.rating) : undefined,
      };
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, payload);
        toast.success("Supplier updated");
      } else {
        await api.post("/suppliers", payload);
        toast.success("Supplier created");
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
    if (!confirm("Delete this supplier?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success("Supplier deleted");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage suppliers, their ratings and outstanding balances"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        }
      />

      <Input
        placeholder="Search suppliers..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="max-w-sm"
      />

      <DataTable
        columns={[
          { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "email", header: "Email", render: (r) => r.email ?? "—" },
          { key: "phone", header: "Phone", render: (r) => r.phone ?? "—" },
          { key: "contactPerson", header: "Contact", render: (r) => r.contactPerson ?? "—" },
          { key: "tin", header: "TIN", render: (r) => r.tin ? <span className="font-mono text-xs">{r.tin}</span> : "—" },
          { key: "rating", header: "Rating", render: (r) => <StarRating value={r.rating} /> },
          {
            key: "outstandingBalance",
            header: "Outstanding",
            render: (r) => {
              const bal = Number(r.outstandingBalance);
              return (
                <span className={bal > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                  ${bal.toFixed(2)}
                </span>
              );
            },
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
        emptyMessage="No suppliers found"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              { field: "name", label: "Name *" },
              { field: "email", label: "Email" },
              { field: "phone", label: "Phone" },
              { field: "contactPerson", label: "Contact Person" },
              { field: "tin", label: "TIN / Tax Number" },
              { field: "rating", label: "Rating (1–5)", type: "number" },
            ] as { field: keyof typeof form; label: string; type?: string }[]).map(({ field, label, type }) => (
              <div key={field} className="space-y-2">
                <Label>{label}</Label>
                <Input
                  type={type ?? "text"}
                  min={type === "number" ? 1 : undefined}
                  max={type === "number" ? 5 : undefined}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  placeholder={label}
                />
              </div>
            ))}
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Full address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving..." : "Save Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

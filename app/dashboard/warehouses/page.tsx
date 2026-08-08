"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Building2, Package } from "lucide-react";
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

export default function WarehousesPage() {
  const { data, loading, page, setPage, totalPages, search, setSearch, refetch } =
    usePaginatedApi<Warehouse>("/warehouses");
  const { data: managers } = usePaginatedApi<Manager>("/employees", { limit: 100 });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState({ name: "", location: "", managerId: "" });
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        description="Manage your storage locations and warehouse stock"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Warehouse
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
            render: (r) => (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{r.name}</span>
              </div>
            ),
          },
          { key: "location", header: "Location", render: (r) => r.location ?? "—" },
          {
            key: "manager",
            header: "Manager",
            render: (r) => r.manager?.name ?? <span className="text-muted-foreground text-xs">Unassigned</span>,
          },
          {
            key: "stocks",
            header: "SKUs",
            render: (r) => (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <Package className="h-3 w-3" />
                {r._count?.stocks ?? 0} SKUs
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
        emptyMessage="No warehouses found. Add your first warehouse to start tracking stock by location."
      />

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
    </div>
  );
}

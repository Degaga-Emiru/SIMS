"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  KeyRound,
  Users,
  Shield,
  Store,
  Warehouse,
  ShoppingBag,
  UserCheck2,
  UserMinus,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePaginatedApi } from "@/lib/hooks/use-api";
import { ROLE_LABELS } from "@/types";
import type { EmployeeStats } from "@/types";
import type { Role } from "@/app/generated/prisma/enums";
import { formatDate } from "@/lib/utils";
import api from "@/lib/api";

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  department: string | null;
  position: string | null;
  status: "ACTIVE" | "INACTIVE";
  lastLogin: string | null;
  createdAt: string;
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  role: "SALES_MANAGER" as Role,
  department: "",
  position: "",
  password: "",
  confirmPassword: "",
  status: "ACTIVE" as "ACTIVE" | "INACTIVE",
};

export default function EmployeesPage() {
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const { data, loading, page, setPage, totalPages, search, setSearch, refetch } =
    usePaginatedApi<Employee>("/employees");
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [activities, setActivities] = useState<Array<{ action: string; entity: string; user: { name: string }; createdAt: string }>>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ role: "" as Role, department: "", position: "", status: "ACTIVE" as "ACTIVE" | "INACTIVE" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ data: EmployeeStats & { recentActivity: typeof activities } }>("/employees/stats").then((res) => {
      setStats(res.data.data);
      setActivities(res.data.data.recentActivity ?? []);
    });
  }, [data]);

  useEffect(() => {
    refetch();
  }, [roleFilter, statusFilter, deptFilter]);

  async function handleCreate() {
    if (form.password !== form.confirmPassword) return toast.error("Passwords don't match");
    setSaving(true);
    try {
      await api.post("/employees", form);
      toast.success("Employee created");
      setOpen(false);
      setForm(emptyForm);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSave() {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/employees/${editing.id}`, editForm);
      toast.success("Employee updated");
      setEditOpen(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(id: string, action: string) {
    try {
      const res = await api.patch(`/employees/${id}`, { action, generateTemporary: action === "reset-password", forcePasswordChange: true });
      if (action === "reset-password" && res.data.data?.temporaryPassword) {
        toast.success(`Temporary password: ${res.data.data.temporaryPassword}`, { duration: 10000 });
      } else {
        toast.success(`Employee ${action.replace("-", " ")}d`);
      }
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success("Employee deleted");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const filtered = data.filter((e) => {
    if (roleFilter && e.role !== roleFilter) return false;
    if (statusFilter && e.status !== statusFilter) return false;
    if (deptFilter && !e.department?.toLowerCase().includes(deptFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Management"
        description="Manage employees, roles, and access (Super Admin only)"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Employee
          </Button>
        }
      />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard title="Total Employees" value={stats.totalEmployees} icon={Users} />
          <StatCard title="Super Admins" value={stats.superAdmins} icon={Shield} />
          <StatCard title="Store Managers" value={stats.storeManagers} icon={Store} />
          <StatCard title="Inventory Managers" value={stats.inventoryManagers} icon={Warehouse} />
          <StatCard title="Sales Managers" value={stats.salesManagers} icon={ShoppingBag} />
          <StatCard title="Active" value={stats.activeEmployees} icon={UserCheck2} />
          <StatCard title="Inactive" value={stats.inactiveEmployees} icon={UserMinus} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search name, email, ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Department" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="max-w-xs" />
      </div>

      <DataTable
        columns={[
          { key: "employeeId", header: "Employee ID" },
          { key: "name", header: "Full Name" },
          { key: "email", header: "Email" },
          { key: "phone", header: "Phone", render: (r) => r.phone ?? "—" },
          { key: "role", header: "Role", render: (r) => <Badge variant="outline">{ROLE_LABELS[r.role]}</Badge> },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <Badge variant={r.status === "ACTIVE" ? "success" : "secondary"}>{r.status}</Badge>
            ),
          },
          { key: "createdAt", header: "Date Joined", render: (r) => formatDate(r.createdAt) },
          { key: "lastLogin", header: "Last Login", render: (r) => r.lastLogin ? formatDate(r.lastLogin) : "Never" },
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" asChild title="View">
                  <Link href={`/dashboard/employees/${r.id}`}><Eye className="h-4 w-4" /></Link>
                </Button>
                <Button variant="ghost" size="icon" title="Edit" onClick={() => {
                  setEditing(r);
                  setEditForm({ role: r.role, department: r.department ?? "", position: r.position ?? "", status: r.status });
                  setEditOpen(true);
                }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {r.status === "ACTIVE" ? (
                  <Button variant="ghost" size="icon" title="Deactivate" onClick={() => handleAction(r.id, "deactivate")}>
                    <UserX className="h-4 w-4 text-yellow-600" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" title="Activate" onClick={() => handleAction(r.id, "activate")}>
                    <UserCheck className="h-4 w-4 text-primary" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" title="Reset Password" onClick={() => handleAction(r.id, "reset-password")}>
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ),
          },
        ]}
        data={filtered}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {activities.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Employee Activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activities.map((a, i) => (
              <p key={i} className="text-sm">
                <span className="font-medium">{a.user.name}</span> {a.action.toLowerCase()} {a.entity}
                <span className="text-muted-foreground ml-2">{formatDate(a.createdAt)}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <PasswordInput value={form.password} showStrength onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <PasswordInput value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "ACTIVE" | "INACTIVE" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name || !form.email}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Employee — {editing?.name}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as "ACTIVE" | "INACTIVE" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={saving}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

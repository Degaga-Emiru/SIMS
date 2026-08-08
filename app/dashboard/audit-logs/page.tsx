"use client";

import { useState } from "react";
import { Trash2, Monitor, Globe } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePaginatedApi } from "@/lib/hooks/use-api";
import { formatDate } from "@/lib/utils";
import api from "@/lib/api";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ipAddress: string | null;
  device: string | null;
  createdAt: string;
  user: { name: string };
}

const actionColor = (action: string) => {
  if (["CREATE"].includes(action)) return "success" as const;
  if (["DELETE", "REJECT"].includes(action)) return "destructive" as const;
  if (["UPDATE", "APPROVE"].includes(action)) return "warning" as const;
  return "secondary" as const;
};

export default function AuditLogsPage() {
  const { data, loading, page, setPage, totalPages, refetch } = usePaginatedApi<AuditLog>("/audit-logs");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"selected" | "days">("selected");
  const [deleteDays, setDeleteDays] = useState<number>(2);
  const [deleting, setDeleting] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === data.length) setSelected(new Set());
    else setSelected(new Set(data.map((d) => d.id)));
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      if (deleteMode === "selected") {
        await api.delete("/audit-logs", { data: { ids: Array.from(selected) } });
        setSelected(new Set());
      } else {
        await api.delete("/audit-logs", { data: { olderThanDays: deleteDays } });
      }
      toast.success("Audit logs deleted");
      setConfirmOpen(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteOne(id: string) {
    if (!confirm("Delete this log?")) return;
    try {
      await api.delete(`/audit-logs/${id}`);
      toast.success("Log deleted");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track all system activity — IP addresses and devices included"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" size="sm" disabled={selected.size === 0}
              onClick={() => { setDeleteMode("selected"); setConfirmOpen(true); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete Selected ({selected.size})
            </Button>
            <Select value={String(deleteDays)} onValueChange={(v) => setDeleteDays(+v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">Older than 2 days</SelectItem>
                <SelectItem value="3">Older than 3 days</SelectItem>
                <SelectItem value="6">Older than 6 days</SelectItem>
                <SelectItem value="30">Older than 30 days</SelectItem>
                <SelectItem value="90">Older than 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm"
              onClick={() => { setDeleteMode("days"); setConfirmOpen(true); }}>
              Delete by Age
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 w-10">
                  <input type="checkbox"
                    checked={selected.size === data.length && data.length > 0}
                    onChange={toggleAll} />
                </th>
                <th className="p-4 text-left">Action</th>
                <th className="p-4 text-left">Entity</th>
                <th className="p-4 text-left">User</th>
                <th className="p-4 text-left">
                  <div className="flex items-center gap-1"><Globe className="h-3 w-3" /> IP Address</div>
                </th>
                <th className="p-4 text-left">
                  <div className="flex items-center gap-1"><Monitor className="h-3 w-3" /> Device</div>
                </th>
                <th className="p-4 text-left">Date</th>
                <th className="p-4 text-left">Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No audit logs yet</td></tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />
                    </td>
                    <td className="p-4">
                      <Badge variant={actionColor(r.action)}>{r.action}</Badge>
                    </td>
                    <td className="p-4">
                      <div>
                        <span className="font-medium">{r.entity}</span>
                        {r.entityId && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{r.entityId.slice(0, 12)}...</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium">{r.user.name}</td>
                    <td className="p-4">
                      {r.ipAddress ? (
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{r.ipAddress}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {r.device ? (
                        <span className="text-xs text-muted-foreground truncate max-w-[120px] block" title={r.device}>
                          {r.device.length > 20 ? r.device.slice(0, 20) + "..." : r.device}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">{formatDate(r.createdAt)}</td>
                    <td className="p-4">
                      <Button variant="ghost" size="icon" onClick={() => deleteOne(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "selected"
                ? `This will permanently delete ${selected.size} selected audit log(s). This action cannot be undone.`
                : `This will permanently delete all audit logs older than ${deleteDays} days. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

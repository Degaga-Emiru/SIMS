"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { Badge } from "@/components/ui/badge";
import { usePaginatedApi } from "@/lib/hooks/use-api";
import { formatDate } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  user: { name: string };
}

export default function AuditLogsPage() {
  const { data, loading, page, setPage, totalPages } = usePaginatedApi<AuditLog>("/audit-logs");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track all system actions and changes"
      />

      <DataTable
        columns={[
          {
            key: "action",
            header: "Action",
            render: (r) => <Badge variant="outline">{r.action}</Badge>,
          },
          { key: "entity", header: "Entity" },
          { key: "entityId", header: "Entity ID", render: (r) => r.entityId ?? "—" },
          { key: "user", header: "User", render: (r) => r.user.name },
          { key: "createdAt", header: "Date", render: (r) => formatDate(r.createdAt) },
        ]}
        data={data}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No audit logs yet"
      />
    </div>
  );
}

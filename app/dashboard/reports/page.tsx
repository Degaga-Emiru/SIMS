"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/dashboard/data-table";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export";
import api from "@/lib/api";
import type { Role } from "@/app/generated/prisma/enums";

type ReportRow = Record<string, unknown>;

export default function ReportsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const isSalesManager = role === "SALES_MANAGER";

  const [activeTab, setActiveTab] = useState(isSalesManager ? "sales" : "inventory");
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<{ key: string; header: string }[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);

  async function loadReport(type: string) {
    setLoading(true);
    setActiveTab(type);
    try {
      const res = await api.get(`/reports/${type}`);
      const report = type === "sales" ? res.data.data.report : res.data.data;
      setData(report);

      if (report.length > 0) {
        setColumns(
          Object.keys(report[0]).map((key) => ({
            key,
            header: key.charAt(0).toUpperCase() + key.slice(1),
          }))
        );
      } else {
        setColumns([]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load report");
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport(isSalesManager ? "sales" : "inventory");
  }, [isSalesManager]);

  function handleExport(format: "csv" | "excel" | "pdf") {
    if (!data.length) return toast.error("No data to export");
    const exportCols = columns.map((c) => ({ key: c.key, header: c.header }));
    const filename = `sims-${activeTab}-report`;
    if (format === "csv") exportToCSV(data, exportCols, filename);
    else if (format === "excel") exportToExcel(data, exportCols, filename);
    else exportToPDF(data, exportCols, filename, `${activeTab} Report`);
    toast.success(`Exported as ${format.toUpperCase()}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={isSalesManager ? "Your personal sales reports" : "Generate and export business reports"}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={loadReport}>
        <TabsList>
          {!isSalesManager && (
            <>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="purchases">Purchases</TabsTrigger>
              <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            </>
          )}
          <TabsTrigger value="sales">My Sales</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          <DataTable
            columns={columns.map((c) => ({ ...c, render: undefined }))}
            data={data.map((row, i) => ({ ...row, id: String(i) }))}
            loading={loading}
            emptyMessage="No report data available"
            onRowClick={(row) => setSelectedReport(row)}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-3">
              {Object.entries(selectedReport)
                .filter(([key]) => key !== "id")
                .map(([key, value]) => (
                  <div key={key} className="rounded-lg border p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{key}</p>
                    <p className="mt-1 text-sm">{value == null ? "—" : String(value)}</p>
                  </div>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

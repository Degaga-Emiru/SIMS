"use client";

import { useSession } from "next-auth/react";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApiData } from "@/lib/hooks/use-api";
import { formatDate } from "@/lib/utils";
import type { Role } from "@/app/generated/prisma/enums";

interface TransferItem {
  id: string;
  product: string;
  quantity: number;
  status: string;
  date: string;
  from: string;
  to: string;
}

interface StoreManagerDashboardResponse {
  tables?: {
    recentStockRequests?: Array<{
      id: string;
      product: string;
      quantity: number;
      status: string;
      date: string;
    }>;
  };
}

export default function StockTransfersPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const canConfirm = role === "STORE_MANAGER";

  const { data } = useApiData<StoreManagerDashboardResponse>("/dashboard/store-manager");
  const transfers = data?.tables?.recentStockRequests?.map((request) => ({
    id: request.id,
    product: request.product,
    quantity: request.quantity,
    status: request.status,
    date: request.date,
    from: "Warehouse",
    to: "Store",
  })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers"
        description="View incoming transfers and confirm received stock"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transfers available.</p>
          ) : (
            <div className="space-y-3">
              {transfers.map((transfer) => (
                <div key={transfer.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{transfer.product}</p>
                    <p className="text-sm text-muted-foreground">{transfer.from} → {transfer.to}</p>
                    <p className="text-xs text-muted-foreground mt-1">Qty: {transfer.quantity} • {formatDate(transfer.date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={transfer.status === "Received" ? "success" : "warning"}>{transfer.status}</Badge>
                    {canConfirm && transfer.status !== "Received" && (
                      <Button variant="outline" size="sm">
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Confirm Receipt
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

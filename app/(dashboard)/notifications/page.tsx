"use client";

import { Bell, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useApiData } from "@/lib/hooks/use-api";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const typeVariant = (type: string) => {
  if (type === "LOW_STOCK") return "warning" as const;
  if (type === "SUCCESS") return "success" as const;
  if (type === "WARNING") return "warning" as const;
  return "secondary" as const;
};

export default function NotificationsPage() {
  const { data, loading, refetch } = useApiData<Notification[]>("/notifications");
  const notifications = data ?? [];

  async function markAllRead() {
    try {
      await api.put("/notifications", { ids: "all" });
      toast.success("All notifications marked as read");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Low stock alerts, sales confirmations, and system warnings"
        action={
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        }
      />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={n.read ? "opacity-60" : ""}>
              <CardContent className="flex items-start justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge variant={typeVariant(n.type)}>{n.type.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(n.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  if (type === "LOW_STOCK") return "destructive" as const;
  if (type === "SUCCESS") return "success" as const;
  if (type === "WARNING") return "warning" as const;
  return "secondary" as const;
};

export default function NotificationsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const router = useRouter();
  const { data, loading, refetch } = useApiData<Notification[]>("/notifications");
  const notifications = data ?? [];
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  async function markAllRead() {
    try {
      await api.put("/notifications", { ids: "all" });
      toast.success("All notifications marked as read");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function handleOpenNotification(notification: Notification) {
    setSelectedNotification(notification);

    if (!notification.read) {
      try {
        await api.put("/notifications", { ids: [notification.id] });
        refetch();
      } catch {
        // ignore and still open the details
      }
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
            <Card
              key={n.id}
              className={`cursor-pointer transition-colors hover:border-primary/40 ${n.read ? "opacity-60" : ""} ${n.type === "LOW_STOCK" ? "border-destructive/40 bg-destructive/[0.02] hover:bg-destructive/[0.06] hover:border-destructive/60" : "hover:bg-muted/50"}`}
              onClick={() => handleOpenNotification(n)}
            >
              <CardContent className="flex items-start justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge variant={typeVariant(n.type)}>{n.type.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(n.createdAt)}</p>
                </div>
                <p className="text-sm text-primary">View details</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title ?? "Notification details"}</DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={typeVariant(selectedNotification.type)}>
                  {selectedNotification.type.replace("_", " ")}
                </Badge>
                <Badge variant={selectedNotification.read ? "secondary" : "default"}>
                  {selectedNotification.read ? "Read" : "Unread"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selectedNotification.message}</p>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Recommended Action</p>
                <p className="mt-1 text-muted-foreground">
                  {selectedNotification.type === "LOW_STOCK"
                    ? "This stock alert highlights a product that is below its safe threshold. Please review the inventory records and restock if needed."
                    : "This notification contains the latest update related to your account and workflow."}
                </p>
                {selectedNotification.type === "LOW_STOCK" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["SUPER_ADMIN", "INVENTORY_MANAGER"].includes(role ?? "") && (
                      <Button
                        size="sm"
                        className="bg-destructive hover:bg-destructive/90 text-white border-transparent text-xs"
                        onClick={() => {
                          setSelectedNotification(null);
                          router.push("/dashboard/purchase-orders");
                        }}
                      >
                        Create Purchase Order
                      </Button>
                    )}
                    {role === "STORE_MANAGER" && (
                      <Button
                        size="sm"
                        className="bg-destructive hover:bg-destructive/90 text-white border-transparent text-xs"
                        onClick={() => {
                          setSelectedNotification(null);
                          router.push("/dashboard/stock-requests");
                        }}
                      >
                        Request Warehouse Stock
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setSelectedNotification(null);
                        router.push("/dashboard/inventory");
                      }}
                    >
                      View Inventory Records
                    </Button>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Received on {formatDate(selectedNotification.createdAt)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

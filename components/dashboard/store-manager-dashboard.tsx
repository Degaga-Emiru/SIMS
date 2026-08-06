"use client";

import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  Package,
  ShoppingCart,
  Truck,
  Warehouse,
  BadgeCheck,
  Clock3,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLoading } from "@/components/dashboard/loading";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiData } from "@/lib/hooks/use-api";
import { formatCurrency } from "@/lib/utils";

interface StoreManagerStats {
  totalProducts: number;
  currentStoreStock: number;
  lowStockItems: number;
  outOfStockItems: number;
  pendingStockRequests: number;
  incomingTransfers: number;
  todaysSales: number;
  todaysSalesRevenue: number;
  todaysOrders: number;
}

interface ChartPoint {
  name: string;
  value: number;
}

interface ChartPointWithSeries {
  name: string;
  incoming: number;
  outgoing: number;
}

interface InventoryStatusPoint {
  name: string;
  value: number;
  color: string;
}

interface StockRequestStatusPoint {
  name: string;
  value: number;
  color: string;
}

interface LowStockCategoryPoint {
  name: string;
  value: number;
  color: string;
}

interface StoreManagerDashboardData {
  stats: StoreManagerStats;
  charts: {
    dailySales: ChartPoint[];
    monthlySales: ChartPoint[];
    inventoryStatus: InventoryStatusPoint[];
    stockMovement: ChartPointWithSeries[];
    topSellingProducts: ChartPoint[];
    lowStockCategories: LowStockCategoryPoint[];
    weeklyOrders: ChartPoint[];
    stockRequestStatus: StockRequestStatusPoint[];
  };
  tables: {
    recentStockRequests: Array<{
      id: string;
      product: string;
      quantity: number;
      status: string;
      date: string;
    }>;
    lowStockProducts: Array<{
      product: string;
      currentStock: number;
      minimumStock: number;
      status: string;
    }>;
  };
  activities: {
    recentActivities: Array<{
      title: string;
      detail: string;
    }>;
    notifications: string[];
  };
}

function statusBadge(status: string) {
  if (status === "Approved" || status === "Completed" || status === "Received") {
    return <Badge variant="success">{status}</Badge>;
  }

  if (status === "Pending") {
    return <Badge variant="warning">{status}</Badge>;
  }

  return <Badge variant="destructive">{status}</Badge>;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border p-3 shadow-md rounded-md text-sm">
        <p className="font-semibold mb-1">{data.name}: {data.value} items</p>
        {data.products && data.products.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Examples:</p>
            <ul className="list-disc pl-4 space-y-1">
              {data.products.map((p: string, i: number) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
            {data.value > data.products.length && (
              <p className="mt-1 italic opacity-75">and {data.value - data.products.length} more...</p>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function StoreManagerDashboard() {
  const { data, loading } = useApiData<StoreManagerDashboardData>("/dashboard/store-manager", { pollingInterval: 5000 });

  if (loading) return <DashboardLoading />;

  const stats = data?.stats;
  const charts = data?.charts;
  const tables = data?.tables;
  const activities = data?.activities;

  const dailySalesData = charts?.dailySales ?? [];
  const monthlySalesData = charts?.monthlySales ?? [];
  const inventoryStatusData = charts?.inventoryStatus ?? [];
  const stockMovementData = charts?.stockMovement ?? [];
  const topSellingProductsData = charts?.topSellingProducts ?? [];
  const lowStockCategoriesData = charts?.lowStockCategories ?? [];
  const weeklyOrdersData = charts?.weeklyOrders ?? [];
  const stockRequestStatusData = charts?.stockRequestStatus ?? [];
  const recentStockRequests = tables?.recentStockRequests ?? [];
  const lowStockProducts = tables?.lowStockProducts ?? [];
  const recentActivities = activities?.recentActivities ?? [];
  const notifications = activities?.notifications ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Manager Dashboard"
        description="Monitor store operations, stock health, sales performance, and transfer activity"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Products" value={stats?.totalProducts ?? 0} icon={Package} />
        <StatCard title="Current Store Stock" value={stats?.currentStoreStock ?? 0} icon={Boxes} />
        <StatCard title="Low Stock Items" value={stats?.lowStockItems ?? 0} icon={AlertTriangle} />
        <StatCard title="Out of Stock Items" value={stats?.outOfStockItems ?? 0} icon={Package} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Pending Stock Requests" value={stats?.pendingStockRequests ?? 0} icon={ClipboardList} />
        <StatCard title="Incoming Transfers" value={stats?.incomingTransfers ?? 0} icon={Truck} />
        <StatCard title="Today's Sales" value={formatCurrency(stats?.todaysSalesRevenue ?? 0)} icon={ShoppingCart} />
        <StatCard title="Today's Orders" value={stats?.todaysOrders ?? 0} icon={Warehouse} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Sales (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} labelFormatter={(label) => `Sales on ${label}`} />
                <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={inventoryStatusData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={3}>
                  {inventoryStatusData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlySalesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} labelFormatter={(label) => `Sales in ${label}`} />
                <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topSellingProductsData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                <Tooltip formatter={(value) => `${Number(value ?? 0)} units sold`} />
                <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Movement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stockMovementData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(value) => `${Number(value ?? 0)} units`} labelFormatter={(label) => `Movement for ${label}`} />
                <Bar dataKey="incoming" stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outgoing" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low Stock Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={lowStockCategoriesData} dataKey="value" nameKey="name" outerRadius={110} label>
                  {lowStockCategoriesData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value ?? 0)} products`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={weeklyOrdersData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(value) => `${Number(value ?? 0)} orders`} labelFormatter={(label) => `Orders on ${label}`} />
                <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#93c5fd" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Request Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={stockRequestStatusData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={3}>
                  {stockRequestStatusData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value ?? 0)} requests`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Stock Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentStockRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.id}</TableCell>
                      <TableCell>{request.product}</TableCell>
                      <TableCell>{request.quantity}</TableCell>
                      <TableCell>{statusBadge(request.status)}</TableCell>
                      <TableCell>{request.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low Stock Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Minimum Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((product) => (
                    <TableRow key={product.product}>
                      <TableCell className="font-medium">{product.product}</TableCell>
                      <TableCell>{product.currentStock}</TableCell>
                      <TableCell>{product.minimumStock}</TableCell>
                      <TableCell>
                        {product.status === "Out of Stock" ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : (
                          <Badge variant="warning">Low</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div key={`${activity.title}-${index}`} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">{activity.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.map((notification, index) => (
              <div key={`${notification}-${index}`} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/40">
                  <Clock3 className="h-4 w-4 text-amber-600" />
                </div>
                <p className="text-sm">{notification}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

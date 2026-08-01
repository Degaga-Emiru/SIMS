"use client";

import {
  Package,
  Tags,
  Truck,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardLoading } from "@/components/dashboard/loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useApiData } from "@/lib/hooks/use-api";
import type { DashboardStats } from "@/types";

interface ChartData {
  salesByMonth: { name: string; value: number }[];
  productsByCategory: { name: string; value: number }[];
  stockAnalytics: { name: string; stock: number; threshold: number }[];
}

interface Activity {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  user: { name: string };
}

const COLORS = ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#15803d"];

export default function DashboardPage() {
  const { data: stats, loading: statsLoading } = useApiData<DashboardStats>("/dashboard/stats");
  const { data: charts, loading: chartsLoading } = useApiData<ChartData>("/dashboard/charts");
  const { data: activities, loading: activitiesLoading } = useApiData<Activity[]>("/dashboard/activities");

  if (statsLoading) return <DashboardLoading />;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your inventory and sales performance" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Products" value={stats?.totalProducts ?? 0} icon={Package} />
        <StatCard title="Categories" value={stats?.totalCategories ?? 0} icon={Tags} />
        <StatCard title="Suppliers" value={stats?.totalSuppliers ?? 0} icon={Truck} />
        <StatCard title="Total Sales" value={stats?.totalSales ?? 0} icon={ShoppingCart} />
        <StatCard title="Revenue" value={formatCurrency(stats?.revenue ?? 0)} icon={DollarSign} />
        <StatCard title="Low Stock" value={stats?.lowStock ?? 0} icon={AlertTriangle} />
      </div>

      {!chartsLoading && charts && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sales by Month</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={charts.salesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Products by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={charts.productsByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {charts.productsByCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Stock Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={charts.stockAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="stock" stroke="#16a34a" strokeWidth={2} />
                  <Line type="monotone" dataKey="threshold" stroke="#ef4444" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !activities?.length ? (
            <p className="text-sm text-muted-foreground">No recent activities</p>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {a.action} — {a.entity}
                    </p>
                    <p className="text-xs text-muted-foreground">by {a.user.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

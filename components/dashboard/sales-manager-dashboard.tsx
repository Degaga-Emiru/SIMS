"use client";

import { useState } from "react";
import {
  ShoppingCart,
  DollarSign,
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  PackageCheck,
  Calendar,
  Layers,
  MapPin,
  PieChart as PieChartIcon,
  BarChart3,
  Plus,
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
  AreaChart,
  Area,
  Legend,
} from "recharts";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useApiData } from "@/lib/hooks/use-api";

interface SMData {
  stats: {
    todaySales: number;
    todayRevenue: number;
    monthSales: number;
    monthRevenue: number;
    unitsSold: number;
    totalCustomers: number;
    pendingOrders: number;
    completedOrders: number;
    returnedSales: number;
    averageOrderValue: number;
  };
  revenueByMonth: { name: string; revenue: number }[];
  dailySalesVolume: { name: string; sales: number }[];
  revenueByRegion: { name: string; value: number }[];
  revenueByCategory: { name: string; value: number }[];
  revenueByChannel: { name: string; value: number }[];
  topSellingProducts: Array<{
    id: string;
    name: string;
    image: string | null;
    unitsSold: number;
    totalRevenue: number;
  }>;
  recentSales: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    status: string;
    createdAt: string;
    customer: { name: string } | null;
    items: Array<{ quantity: number; product: { name: string } }>;
  }>;
}

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#9333ea", "#06b6d4", "#ec4899"];

export function SalesManagerDashboard() {
  const { data, loading } = useApiData<SMData>("/dashboard/sales-manager");
  const [timeRange, setTimeRange] = useState<"today" | "7days" | "30days" | "month" | "all">("month");

  if (loading) return <p className="text-muted-foreground p-4">Loading sales performance analytics...</p>;
  if (!data) return null;

  const {
    stats,
    revenueByMonth,
    dailySalesVolume,
    revenueByRegion,
    revenueByCategory,
    revenueByChannel,
    topSellingProducts,
    recentSales,
  } = data;

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <PageHeader
        title="Sales Manager Dashboard"
        description="Real-time sales performance metrics, revenue analytics, and pipeline tracker"
        action={
          <div className="flex items-center gap-2">
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/dashboard/sales/new">
                <Plus className="h-4 w-4 mr-1" /> Create New Sale
              </Link>
            </Button>
          </div>
        }
      />

      {/* Time Range Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Sales Analytics Period:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["today", "7days", "30days", "month", "all"] as const).map((period) => (
            <Button
              key={period}
              variant={timeRange === period ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeRange(period)}
              className="text-xs capitalize"
            >
              {period === "7days"
                ? "Last 7 Days"
                : period === "30days"
                ? "Last 30 Days"
                : period === "month"
                ? "This Month"
                : period === "all"
                ? "All Time"
                : "Today"}
            </Button>
          ))}
        </div>
      </div>

      {/* 8 Primary Sales KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <StatCard title="Today's Revenue" value={formatCurrency(stats.todayRevenue)} icon={DollarSign} />
        <StatCard title="Today's Orders" value={stats.todaySales} icon={ShoppingCart} />
        <StatCard title="Units Sold" value={stats.unitsSold} icon={PackageCheck} />
        <StatCard title="Avg Order Value" value={formatCurrency(stats.averageOrderValue)} icon={TrendingUp} />
        <StatCard title="Monthly Revenue" value={formatCurrency(stats.monthRevenue)} icon={DollarSign} />
        <StatCard title="Pending Orders" value={stats.pendingOrders} icon={Clock} />
        <StatCard title="Completed Orders" value={stats.completedOrders} icon={CheckCircle2} />
        <StatCard title="Total Customers" value={stats.totalCustomers} icon={Users} />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Performance Over Time (Area Chart) */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Sales Performance Over Time (Monthly Revenue)
              </CardTitle>
              <CardDescription>Historical revenue trend over the past 6 months</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [formatCurrency(Number(v ?? 0)), "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Sales Revenue & Volume (New Bar Chart) */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Daily Sales Revenue (Last 7 Days)
              </CardTitle>
              <CardDescription>Daily revenue performance for the past week</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailySalesVolume}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [formatCurrency(Number(v ?? 0)), "Daily Revenue"]} />
                <Bar dataKey="sales" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Product Category (Bar Chart) */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                Revenue by Product Category
              </CardTitle>
              <CardDescription>Category distribution of sales revenue</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByCategory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [formatCurrency(Number(v ?? 0)), "Revenue"]} />
                <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Sales Channel (Pie/Donut Chart) */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-purple-600" />
                Revenue by Sales Channel
              </CardTitle>
              <CardDescription>Revenue split across sales channels & order types</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={revenueByChannel}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {revenueByChannel.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [formatCurrency(Number(v ?? 0)), "Revenue"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Region / Store City */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-600" />
                Revenue by Region / Location
              </CardTitle>
              <CardDescription>Sales distribution by customer region or city</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByRegion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis type="number" className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                <Tooltip formatter={(v: any) => [formatCurrency(Number(v ?? 0)), "Revenue"]} />
                <Bar dataKey="value" fill="#d97706" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Selling Products */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Top-Selling Products
          </CardTitle>
          <CardDescription>Products generating highest volume and revenue</CardDescription>
        </CardHeader>
        <CardContent>
          {topSellingProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No product sales recorded yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {topSellingProducts.map((p) => (
                <div key={p.id} className="flex flex-col items-center rounded-xl border bg-card p-4 text-center shadow-xs transition-shadow hover:shadow-md">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border bg-secondary/40 mb-3">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <PackageCheck className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-semibold text-sm line-clamp-1">{p.name}</p>
                  <p className="text-xl font-bold text-primary mt-1">{p.unitsSold} <span className="text-xs font-normal text-muted-foreground">units</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(p.totalRevenue)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sales & Invoices Table */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Recent Sales & Invoices</CardTitle>
            <CardDescription>Track latest confirmed sales and customer transactions</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/sales">View All Sales</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent sales found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">Invoice #</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">Customer</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">Items</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">Total</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-primary">
                        <Link href={`/dashboard/sales/${s.id}`} className="hover:underline">
                          {s.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-medium">{s.customer?.name ?? "Walk-in Customer"}</td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">
                        {s.items?.length ? `${s.items.length} items (${s.items.reduce((acc, i) => acc + i.quantity, 0)} pcs)` : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{formatCurrency(Number(s.totalAmount))}</td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">{formatDate(s.createdAt)}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={s.status === "COMPLETED" ? "success" : s.status === "PENDING" ? "secondary" : "destructive"}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/dashboard/sales/${s.id}`}>View Invoice</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


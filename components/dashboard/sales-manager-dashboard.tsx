"use client";

import {
  ShoppingCart,
  DollarSign,
  Users,
  Clock,
  RotateCcw,
  TrendingUp,
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
} from "recharts";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useApiData } from "@/lib/hooks/use-api";
import type { SalesManagerStats } from "@/types";

interface SMData {
  stats: SalesManagerStats;
  dailySales: { name: string; value: number }[];
  topSellingProducts: { name: string; value: number }[];
  salesByCategory: { name: string; value: number }[];
  recentSales: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    status: string;
    createdAt: string;
    customer: { name: string } | null;
  }>;
}

const COLORS = ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0"];

export function SalesManagerDashboard() {
  const { data, loading } = useApiData<SMData>("/dashboard/sales-manager");

  if (loading) return <p className="text-muted-foreground">Loading dashboard...</p>;
  if (!data) return null;

  const { stats, dailySales, topSellingProducts, salesByCategory, recentSales } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Dashboard"
        description="Your personal sales performance overview"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard title="Today's Sales" value={stats.todaySales} icon={ShoppingCart} />
        <StatCard title="Today's Revenue" value={formatCurrency(stats.todayRevenue)} icon={DollarSign} />
        <StatCard title="This Month Sales" value={stats.monthSales} icon={TrendingUp} />
        <StatCard title="Month Revenue" value={formatCurrency(stats.monthRevenue)} icon={DollarSign} />
        <StatCard title="Customers" value={stats.totalCustomers} icon={Users} />
        <StatCard title="Pending Orders" value={stats.pendingOrders} icon={Clock} />
        <StatCard title="Returned Sales" value={stats.returnedSales} icon={RotateCcw} />
        <StatCard title="Avg Order" value={formatCurrency(stats.averageOrderValue)} icon={DollarSign} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Daily Sales (Last 7 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailySales}>
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
          <CardHeader><CardTitle className="text-base">Sales by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={salesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {salesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Top Selling Products</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {topSellingProducts.map((p) => (
                <div key={p.name} className="rounded-lg border p-4 text-center">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{p.value}</p>
                  <p className="text-xs text-muted-foreground">units sold</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">My Recent Sales</CardTitle>
          <Button asChild size="sm"><Link href="/dashboard/sales">View All</Link></Button>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Invoice</th>
                    <th className="text-left py-2">Customer</th>
                    <th className="text-left py-2">Total</th>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((s) => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="py-2">
                        <Link href={`/dashboard/sales/${s.id}`} className="text-primary hover:underline font-mono">
                          {s.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-2">{s.customer?.name ?? "Walk-in"}</td>
                      <td className="py-2">{formatCurrency(Number(s.totalAmount))}</td>
                      <td className="py-2">{formatDate(s.createdAt)}</td>
                      <td className="py-2"><Badge variant="success">{s.status}</Badge></td>
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

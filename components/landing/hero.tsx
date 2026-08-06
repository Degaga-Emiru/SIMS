import Link from "next/link";
import { ArrowRight, Play, BarChart3, Boxes, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-20 lg:pt-16 lg:pb-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-40 right-0 h-[300px] w-[300px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[250px] w-[250px] rounded-full bg-accent blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Smart Inventory Management System
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Take Control of Your{" "}
              <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                Inventory
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Streamline stock tracking, automate reorder alerts, and gain real-time insights.
              SIMS helps businesses of all sizes manage inventory smarter and grow faster.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" asChild className="shadow-lg shadow-primary/25">
                <Link href="/login">
                  Start Free Trial
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">
                  <Play className="mr-1 h-4 w-4" />
                  See How It Works
                </Link>
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["S", "M", "J", "A"].map((initial) => (
                    <div
                      key={initial}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-xs font-semibold text-primary"
                    >
                      {initial}
                    </div>
                  ))}
                </div>
                <span>500+ businesses trust SIMS</span>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-primary/5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dashboard Overview</p>
                  <p className="text-2xl font-bold text-foreground">$124,580</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="mb-6 flex h-32 items-end gap-2">
                {[40, 65, 45, 80, 55, 90, 70, 85].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-primary/80 to-primary/30 transition-all"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <Boxes className="mb-2 h-5 w-5 text-primary" />
                  <p className="text-xs text-muted-foreground">Total Products</p>
                  <p className="text-lg font-bold">10,248</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <TrendingUp className="mb-2 h-5 w-5 text-primary" />
                  <p className="text-xs text-muted-foreground">Growth Rate</p>
                  <p className="text-lg font-bold text-primary">+24.5%</p>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
              <p className="text-xs text-muted-foreground">Low Stock Alert</p>
              <p className="text-sm font-semibold text-destructive">12 items need reorder</p>
            </div>

            <div className="absolute -bottom-4 -left-4 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
              <p className="text-xs text-muted-foreground">Orders Today</p>
              <p className="text-sm font-semibold text-primary">+38 processed</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

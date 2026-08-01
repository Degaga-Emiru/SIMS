import {
  Package,
  BarChart3,
  Bell,
  ScanBarcode,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Package,
    title: "Real-Time Stock Tracking",
    description:
      "Monitor inventory levels across multiple warehouses with live updates and accurate stock counts.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description:
      "Visualize sales trends, turnover rates, and demand forecasts with powerful reporting dashboards.",
  },
  {
    icon: Bell,
    title: "Smart Reorder Alerts",
    description:
      "Never run out of stock. Get automated notifications when items fall below your custom thresholds.",
  },
  {
    icon: ScanBarcode,
    title: "Barcode Scanning",
    description:
      "Speed up receiving and shipping with integrated barcode and QR code scanning support.",
  },
  {
    icon: Users,
    title: "Multi-User Access",
    description:
      "Collaborate with your team using role-based permissions for admins, managers, and staff.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    description:
      "Enterprise-grade security with encrypted data, audit logs, and 99.9% uptime guarantee.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-muted/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Features
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything You Need to Manage Inventory
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful tools designed to simplify inventory management and boost your operational
            efficiency.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className={cn(
                "group border-border/60 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                index === 1 && "lg:translate-y-4",
                index === 4 && "lg:translate-y-4"
              )}
            >
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

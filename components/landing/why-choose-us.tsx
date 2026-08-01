import {
  Zap,
  Clock,
  HeadphonesIcon,
  Globe,
  Layers,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Zap,
    title: "Lightning Fast Setup",
    description: "Get up and running in minutes, not days. Import your existing inventory with one click.",
  },
  {
    icon: Clock,
    title: "Save 10+ Hours Weekly",
    description: "Automate manual tasks like stock counts, reordering, and report generation.",
  },
  {
    icon: HeadphonesIcon,
    title: "24/7 Expert Support",
    description: "Our dedicated support team is always ready to help you succeed.",
  },
  {
    icon: Globe,
    title: "Multi-Location Support",
    description: "Manage inventory across warehouses, stores, and distribution centers seamlessly.",
  },
  {
    icon: Layers,
    title: "Seamless Integrations",
    description: "Connect with Shopify, WooCommerce, QuickBooks, and 50+ other platforms.",
  },
  {
    icon: RefreshCw,
    title: "Always Up to Date",
    description: "Automatic updates with new features and security patches at no extra cost.",
  },
];

export function WhyChooseUs() {
  return (
    <section id="why-us" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              Why Choose SIMS
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for Modern Businesses That Demand More
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              We understand the challenges of inventory management. That&apos;s why we built SIMS
              to be intuitive, powerful, and scalable — so you can focus on growing your business.
            </p>

            <div className="mt-8 space-y-4">
              {["No credit card required", "14-day free trial", "Cancel anytime"].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <svg
                      className="h-3.5 w-3.5 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className={cn(
                  "group rounded-xl border border-border/60 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
                  index % 2 === 1 && "sm:translate-y-6"
                )}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary">
                  <benefit.icon className="h-5 w-5 text-primary transition-colors group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

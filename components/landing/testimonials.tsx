"use client";

import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Operations Director, TechMart",
    content:
      "SIMS transformed how we manage inventory across 12 locations. Stock discrepancies dropped by 94% in the first quarter.",
    rating: 5,
  },
  {
    name: "James Chen",
    role: "Store Manager, FreshGoods",
    content:
      "The low-stock alerts alone saved us from countless stockouts. Our team loves the intuitive dashboard and real-time analytics.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "CEO, RetailPro Solutions",
    content:
      "We evaluated five inventory systems before choosing SIMS. The role-based access and purchase order workflow are exactly what we needed.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Trusted by <span className="text-primary">Industry Leaders</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            See what businesses like yours are saying about SIMS.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((item) => (
            <Card key={item.name} className="relative border-border/60 bg-background">
              <CardContent className="pt-6">
                <Quote className="h-8 w-8 text-primary/30" />
                <p className="mt-4 text-muted-foreground leading-relaxed">&ldquo;{item.content}&rdquo;</p>
                <div className="mt-4 flex gap-1">
                  {Array.from({ length: item.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <div className="mt-6 border-t pt-4">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

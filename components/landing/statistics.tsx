"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const stats = [
  { value: 10000, suffix: "+", label: "Products Managed", prefix: "" },
  { value: 500, suffix: "+", label: "Active Businesses", prefix: "" },
  { value: 99.9, suffix: "%", label: "Uptime Guarantee", prefix: "" },
  { value: 2, suffix: "M+", label: "Orders Processed", prefix: "" },
];

function useCountUp(end: number, duration: number, isVisible: boolean, decimals = 0) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((eased * end).toFixed(decimals)));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isVisible, decimals]);

  return count;
}

function StatItem({
  value,
  suffix,
  label,
  prefix,
  isVisible,
}: {
  value: number;
  suffix: string;
  label: string;
  prefix: string;
  isVisible: boolean;
}) {
  const decimals = value % 1 !== 0 ? 1 : 0;
  const count = useCountUp(value, 2000, isVisible, decimals);

  const displayValue =
    value >= 1000 && suffix === "+"
      ? `${Math.floor(count / 1000)}K${suffix}`
      : `${prefix}${decimals > 0 ? count.toFixed(1) : Math.floor(count)}${suffix}`;

  return (
    <div className="text-center">
      <p className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">{displayValue}</p>
      <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-base">{label}</p>
    </div>
  );
}

export function Statistics() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-20 lg:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/30" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Trusted by Businesses Worldwide
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join hundreds of companies already optimizing their inventory with SIMS.
          </p>
        </div>

        <div
          className={cn(
            "mt-16 grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-12",
            isVisible && "animate-fade-in"
          )}
        >
          {stats.map((stat) => (
            <StatItem key={stat.label} {...stat} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
}

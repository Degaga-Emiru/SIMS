"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthFormProps {
  title: string;
  description?: string;
  error?: string | null;
  success?: string | null;
  children: React.ReactNode;
  className?: string;
}

export function AuthForm({
  title,
  description,
  error,
  success,
  children,
  className,
}: AuthFormProps) {
  return (
    <Card className={cn("w-full max-w-md animate-fade-in shadow-lg", className)}>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold text-primary">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary">
            {success}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

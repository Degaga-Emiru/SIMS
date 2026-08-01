import { Package } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-100 px-4 py-12 dark:from-green-950/20 dark:via-background dark:to-green-950/10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
          <Package className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Smart Inventory
        </h1>
        <p className="text-sm text-muted-foreground">Management System</p>
      </div>
      {children}
    </div>
  );
}

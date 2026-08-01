"use client";

import { AuthSessionProvider } from "./session-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthSessionProvider>
        <QueryProvider>{children}</QueryProvider>
      </AuthSessionProvider>
    </ThemeProvider>
  );
}

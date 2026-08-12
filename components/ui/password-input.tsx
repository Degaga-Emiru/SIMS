"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean;
}

export function evaluatePasswordStrength(password: string) {
  let score = 0;
  if (!password) return { score: 0, label: "", color: "", isGood: false };

  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return { score, label: "Weak password", color: "bg-destructive text-destructive", isGood: false };
  } else if (score === 3 || score === 4) {
    return { score, label: "Medium password", color: "bg-amber-500 text-amber-600 dark:text-amber-400", isGood: false };
  } else {
    return { score, label: "Good / Strong password!", color: "bg-emerald-500 text-emerald-600 dark:text-emerald-400", isGood: true };
  }
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrength = false, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const passwordStr = typeof value === "string" ? value : "";
    const strength = evaluatePasswordStrength(passwordStr);

    return (
      <div className="space-y-1.5 w-full">
        <div className="relative flex items-center">
          <Input
            type={showPassword ? "text" : "password"}
            className={cn("pr-10", className)}
            value={value}
            onChange={onChange}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {showStrength && passwordStr.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-secondary">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={cn(
                    "h-full flex-1 transition-all duration-300",
                    step <= strength.score
                      ? strength.score <= 2
                        ? "bg-destructive"
                        : strength.score <= 4
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                      : "bg-transparent"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium">
              {strength.isGood ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Check className="h-3.5 w-3.5" />
                  {strength.label}
                </span>
              ) : (
                <span className={cn("flex items-center gap-1", strength.color)}>
                  <X className="h-3.5 w-3.5" />
                  {strength.label} (Needs 8+ chars, uppercase, numbers, symbols)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

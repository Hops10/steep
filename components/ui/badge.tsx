import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "green" | "blue" | "grey";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        {
          "bg-slate-900 text-white": variant === "default",
          "border border-slate-300 text-slate-700": variant === "outline",
          "bg-green-100 text-green-800": variant === "green",
          "bg-blue-100 text-blue-800": variant === "blue",
          "bg-slate-100 text-slate-500": variant === "grey",
        },
        className
      )}
      {...props}
    />
  );
}

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "blue" | "red" | "gray" | "green";
}

export function Badge({
  className,
  variant = "gray",
  children,
  ...props
}: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium";
  
  const variants = {
    blue: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300",
    red: "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-red-300",
    gray: "bg-muted text-muted-foreground dark:bg-muted dark:text-slate-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}

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
  // Toss Design System - Badge Styles
  const baseStyles = "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold";

  const variants = {
    blue: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
    red: "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive",
    gray: "bg-grey-100 text-grey-600 dark:bg-grey-100 dark:text-grey-600",
    green: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-500",
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

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
    blue: "bg-[#E8F3FF] text-[#1B64DA] dark:bg-blue-500/20 dark:text-blue-300",
    red: "bg-[#FEE9EA] text-[#E32F3C] dark:bg-red-500/20 dark:text-red-300",
    gray: "bg-[#F2F4F6] text-[#4E5968] dark:bg-slate-800 dark:text-slate-300",
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

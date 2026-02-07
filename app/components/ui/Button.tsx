"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "lg" | "md" | "sm";
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  // Toss Design System - Button Styles
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none btn-press";

  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-toss-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-grey-200 border border-transparent",
    ghost: "bg-transparent text-foreground hover:bg-grey-100",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-toss-sm",
  };

  // Toss Design System - Size Scale (Increased Radius)
  const sizes = {
    lg: "h-14 px-6 text-base rounded-2xl",
    md: "h-12 px-5 text-sm rounded-xl",
    sm: "h-9 px-4 text-xs rounded-lg",
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}

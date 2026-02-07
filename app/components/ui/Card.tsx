import React from "react";
import { cn } from "./Button";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "glass";
  hover?: boolean;
  children: React.ReactNode;
}

export function Card({
  className,
  variant = "default",
  hover = false,
  children,
  ...props
}: CardProps) {
  // Toss Design System - Card Styles
  const baseStyles = "transition-all duration-200 overflow-hidden flex flex-col";

  const variants = {
    default: "bg-card text-card-foreground shadow-toss border border-border/40 dark:border-border/10 rounded-3xl",
    elevated: "bg-card text-card-foreground shadow-toss-md border border-border/40 dark:border-border/10 rounded-3xl",
    glass: "glass-card text-card-foreground rounded-3xl",
  };

  return (
    <div
      className={cn(
        baseStyles,
        variants[variant],
        hover && "hover-lift cursor-pointer active:scale-[0.99]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

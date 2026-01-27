import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  const baseStyles = "rounded-[var(--radius)] transition-all duration-200 overflow-hidden flex flex-col";
  
  const variants = {
    default: "bg-card text-card-foreground shadow-toss border-none",
    elevated: "bg-card text-card-foreground shadow-lg shadow-black/5 dark:shadow-black/20 border-none",
    glass: "glass-card text-card-foreground",
  };

  return (
    <div
      className={cn(
        baseStyles,
        variants[variant],
        hover && "hover:scale-[1.02] hover:shadow-xl cursor-pointer active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

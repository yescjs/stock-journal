"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  multiline?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, multiline = false, ...props }, ref: React.ForwardedRef<HTMLInputElement | HTMLTextAreaElement>) => {
    // Toss Design System - Input Styles
    const baseInputStyles = cn(
      "w-full bg-grey-100 text-foreground placeholder:text-grey-400",
      "border-none outline-none transition-all duration-200 shadow-toss-sm",
      "focus:bg-card focus:ring-2 focus:ring-primary/20",
      "dark:bg-grey-100 dark:text-foreground dark:placeholder:text-grey-400 dark:focus:bg-card",
      "rounded-xl text-sm h-12 px-4",
      error && "bg-red-50 text-red-900 placeholder:text-red-300 focus:ring-red-500/20 dark:bg-red-900/10 dark:text-red-100",
      leftIcon && "pl-11",
      rightIcon && "pr-11",
      className
    );

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-muted-foreground ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          {multiline ? (
            <textarea
              ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
              className={cn(baseInputStyles, "min-h-[100px] resize-none")}
              {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              ref={ref as React.ForwardedRef<HTMLInputElement>}
              className={baseInputStyles}
              {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          )}
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-500 ml-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

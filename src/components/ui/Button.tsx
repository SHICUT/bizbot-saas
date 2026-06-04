import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500/40 shadow-sm": variant === "primary",
            "bg-white text-text-primary border border-border hover:bg-gray-50 focus:ring-emerald-500/20 shadow-sm": variant === "secondary",
            "text-text-secondary hover:text-text-primary hover:bg-gray-100 focus:ring-emerald-500/20": variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/40": variant === "danger",
          },
          {
            "text-xs px-3 py-1.5 gap-1.5": size === "sm",
            "text-sm px-4 py-2 gap-2": size === "md",
            "text-sm px-5 py-2.5 gap-2.5": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;

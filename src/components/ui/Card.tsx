import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

export default function Card({ className, padding = "md", hover = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        hover && "card-hover cursor-pointer",
        { "p-0": padding === "none", "p-4": padding === "sm", "p-5": padding === "md", "p-7": padding === "lg" },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

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
        "bg-white rounded-xl border border-border shadow-sm",
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

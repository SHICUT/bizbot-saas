import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Indian format.
 * ₹0, ₹999, ₹1K, ₹10K, ₹1L, ₹10L, ₹1Cr, ₹10Cr
 * Never shows ₹0.0k or unnecessary decimals.
 */
export function formatINR(amount: number): string {
  if (amount === 0) return "₹0";
  if (amount < 0) return `-${formatINR(Math.abs(amount))}`;

  if (amount < 1000) return `₹${Math.round(amount)}`;
  if (amount < 100000) {
    const k = amount / 1000;
    return `₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  if (amount < 10000000) {
    const l = amount / 100000;
    return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1).replace(/\.0$/, "")}L`;
  }
  const cr = amount / 10000000;
  return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1).replace(/\.0$/, "")}Cr`;
}

/**
 * Format currency with full Indian locale (₹1,23,456)
 * For exact values in tables/details.
 */
export function formatINRFull(amount: number): string {
  if (amount === 0) return "₹0";
  return `₹${amount.toLocaleString("en-IN")}`;
}

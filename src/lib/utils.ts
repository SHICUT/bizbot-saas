import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format USD amount in compact format.
 * $0, $999, $1K, $10K, $100K, $1M
 */
export function formatUSD(amount: number): string {
  if (amount === 0) return "$0";
  if (amount < 0) return `-${formatUSD(Math.abs(amount))}`;
  if (amount < 1000) return `$${Math.round(amount)}`;
  if (amount < 1000000) {
    const k = amount / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  const m = amount / 1000000;
  return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")}M`;
}

/**
 * Format USD with full locale formatting ($1,234,567)
 */
export function formatUSDFull(amount: number): string {
  if (amount === 0) return "$0";
  return `$${amount.toLocaleString("en-US")}`;
}

/**
 * @deprecated Use formatUSD instead. Kept for backward compatibility during migration.
 */
export const formatINR = formatUSD;

/**
 * @deprecated Use formatUSDFull instead. Kept for backward compatibility during migration.
 */
export const formatINRFull = formatUSDFull;

/**
 * Format in business currency (supports multiple currencies).
 * Default: USD.
 */
export type CurrencyCode = "USD" | "INR" | "AED" | "EUR" | "GBP";

const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; locale: string }> = {
  USD: { symbol: "$", locale: "en-US" },
  INR: { symbol: "₹", locale: "en-IN" },
  AED: { symbol: "د.إ", locale: "ar-AE" },
  EUR: { symbol: "€", locale: "de-DE" },
  GBP: { symbol: "£", locale: "en-GB" },
};

export function formatCurrency(amount: number, currency: CurrencyCode = "USD"): string {
  if (amount === 0) return `${CURRENCY_CONFIG[currency].symbol}0`;
  const cfg = CURRENCY_CONFIG[currency];

  if (currency === "USD") return formatUSD(amount);

  // For non-USD currencies, use standard K/M format
  if (amount < 1000) return `${cfg.symbol}${Math.round(amount)}`;
  if (amount < 1000000) {
    const k = amount / 1000;
    return `${cfg.symbol}${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  const m = amount / 1000000;
  return `${cfg.symbol}${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")}M`;
}

/**
 * Format full amount with locale-specific separators
 */
export function formatCurrencyFull(amount: number, currency: CurrencyCode = "USD"): string {
  if (amount === 0) return `${CURRENCY_CONFIG[currency].symbol}0`;
  const cfg = CURRENCY_CONFIG[currency];
  return `${cfg.symbol}${amount.toLocaleString(cfg.locale)}`;
}

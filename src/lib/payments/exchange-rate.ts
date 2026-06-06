/**
 * Live Exchange Rate Service
 *
 * Fetches USD→INR rate from a public API with in-memory caching.
 * Used only for Razorpay payment processing (Razorpay requires INR).
 *
 * NEVER use a hardcoded exchange rate for billing calculations.
 */

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

// Cache for 1 hour (3600000 ms)
const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedRate: CachedRate | null = null;

/**
 * Fetch the live USD to INR exchange rate.
 * Uses exchangerate.host (free, no API key required) as primary,
 * falls back to a conservative estimate only if the API is unreachable.
 */
export async function getUsdToInrRate(): Promise<number> {
  // Return cached rate if still fresh
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_TTL_MS) {
    return cachedRate.rate;
  }

  try {
    // Primary: exchangerate-api (free tier, no key needed)
    const res = await fetch(
      "https://open.er-api.com/v6/latest/USD",
      { next: { revalidate: 3600 } } // Next.js fetch cache for 1 hour
    );

    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.INR;
      if (typeof rate === "number" && rate > 50 && rate < 150) {
        cachedRate = { rate, fetchedAt: Date.now() };
        return rate;
      }
    }
  } catch (err) {
    console.warn("[ExchangeRate] Primary API failed:", err);
  }

  try {
    // Fallback: alternative free API
    const res = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD"
    );

    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.INR;
      if (typeof rate === "number" && rate > 50 && rate < 150) {
        cachedRate = { rate, fetchedAt: Date.now() };
        return rate;
      }
    }
  } catch (err) {
    console.warn("[ExchangeRate] Fallback API failed:", err);
  }

  // If we have a stale cached rate, use it rather than failing
  if (cachedRate) {
    console.warn("[ExchangeRate] Using stale cached rate:", cachedRate.rate);
    return cachedRate.rate;
  }

  // Last resort: throw so the caller knows conversion failed
  throw new Error(
    "Unable to fetch live exchange rate. Payment cannot be processed without a verified rate."
  );
}

/**
 * Convert USD amount to INR paise using live exchange rate.
 * Razorpay requires amount in smallest currency unit (paise = INR × 100).
 */
export async function usdToInrPaiseLive(usd: number): Promise<number> {
  const rate = await getUsdToInrRate();
  return Math.round(usd * rate * 100);
}

/**
 * Convert USD amount to INR using live exchange rate (for display).
 */
export async function usdToInrLive(usd: number): Promise<number> {
  const rate = await getUsdToInrRate();
  return Math.round(usd * rate);
}

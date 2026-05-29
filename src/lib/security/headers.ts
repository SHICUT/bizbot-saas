/**
 * Security Headers
 *
 * Applied via next.config.ts to all responses.
 * Follows OWASP recommendations for web application security.
 */

export const securityHeaders = [
  {
    // Prevent clickjacking
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Prevent MIME type sniffing
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Control referrer information
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Permissions policy (disable unused browser features)
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    // Strict Transport Security (force HTTPS)
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    // XSS Protection (legacy browsers)
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
];
